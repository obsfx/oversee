package lsp

import (
	"bufio"
	"context"
	"encoding/json/jsontext"
	"encoding/json/v2"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	methodNotFound   = -32601
	requestCancelled = -32800
	contentModified  = -32801
	serverCancelled  = -32802
	maxFrameSize     = 64 << 20
	writeTimeout     = 5 * time.Second
)

var lenient = []json.Options{jsontext.AllowInvalidUTF8(true), jsontext.AllowDuplicateNames(true)}

var ErrClosed = errors.New("language server connection closed")

type Transport interface {
	io.ReadWriteCloser
	Done() <-chan struct{}
	Err() error
	Kill()
}

type RequestHandler func(method string, params jsontext.Value) (any, error)

type NotificationHandler func(method string, params jsontext.Value)

type ResponseError struct {
	Code    int64  `json:"code"`
	Message string `json:"message"`
}

func (e *ResponseError) Error() string {
	return fmt.Sprintf("language server error %d: %s", e.Code, e.Message)
}

func (e *ResponseError) Retryable() bool {
	return e.Code == requestCancelled || e.Code == contentModified || e.Code == serverCancelled
}

func IsRetryable(err error) bool {
	responseErr, ok := errors.AsType[*ResponseError](err)
	return ok && responseErr.Retryable()
}

type incoming struct {
	ID     jsontext.Value `json:"id"`
	Method string         `json:"method"`
	Params jsontext.Value `json:"params"`
	Result jsontext.Value `json:"result"`
	Error  *ResponseError `json:"error"`
}

type outgoingRequest struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int64  `json:"id"`
	Method  string `json:"method"`
	Params  any    `json:"params,omitzero"`
}

type outgoingNotification struct {
	JSONRPC string `json:"jsonrpc"`
	Method  string `json:"method"`
	Params  any    `json:"params,omitzero"`
}

type outgoingResult struct {
	JSONRPC string         `json:"jsonrpc"`
	ID      jsontext.Value `json:"id"`
	Result  any            `json:"result"`
}

type outgoingError struct {
	JSONRPC string         `json:"jsonrpc"`
	ID      jsontext.Value `json:"id"`
	Error   *ResponseError `json:"error"`
}

type cancelParams struct {
	ID int64 `json:"id"`
}

type reply struct {
	result jsontext.Value
	err    error
}

type Conn struct {
	transport Transport
	handle    RequestHandler
	notified  NotificationHandler
	writeMu   sync.Mutex
	mu        sync.Mutex
	nextID    int64
	pending   map[int64]chan reply
	closed    chan struct{}
	closeErr  error
}

func NewConn(transport Transport, handle RequestHandler, notified NotificationHandler) *Conn {
	conn := &Conn{transport: transport, handle: handle, notified: notified, pending: map[int64]chan reply{}, closed: make(chan struct{})}
	go conn.read()
	return conn
}

func (c *Conn) Call(ctx context.Context, method string, params, result any) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	c.mu.Lock()
	if c.closeErr != nil {
		c.mu.Unlock()
		return c.closeErr
	}
	c.nextID++
	id := c.nextID
	replies := make(chan reply, 1)
	c.pending[id] = replies
	c.mu.Unlock()
	defer c.forget(id)
	if err := c.send(outgoingRequest{JSONRPC: "2.0", ID: id, Method: method, Params: params}); err != nil {
		return err
	}
	select {
	case <-ctx.Done():
		c.Notify("$/cancelRequest", cancelParams{ID: id})
		return ctx.Err()
	case <-c.closed:
		return c.closeErr
	case answer := <-replies:
		if answer.err != nil || result == nil || len(answer.result) == 0 {
			return answer.err
		}
		if err := json.Unmarshal(answer.result, result, lenient...); err != nil {
			return fmt.Errorf("decode %s result: %w", method, err)
		}
		return nil
	}
}

func (c *Conn) Notify(method string, params any) error {
	return c.send(outgoingNotification{JSONRPC: "2.0", Method: method, Params: params})
}

func (c *Conn) send(message any) error {
	ctx, cancel := context.WithTimeout(context.Background(), writeTimeout)
	defer cancel()
	return c.write(ctx, message)
}

func (c *Conn) Done() <-chan struct{} {
	return c.closed
}

func (c *Conn) Err() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.closeErr
}

func (c *Conn) forget(id int64) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.pending, id)
}

func (c *Conn) write(ctx context.Context, message any) error {
	body, err := json.Marshal(message, lenient...)
	if err != nil {
		return err
	}
	c.writeMu.Lock()
	defer c.writeMu.Unlock()
	if err := ctx.Err(); err != nil {
		return err
	}
	stop := context.AfterFunc(ctx, c.transport.Kill)
	defer stop()
	if _, err := fmt.Fprintf(c.transport, "Content-Length: %d\r\n\r\n", len(body)); err != nil {
		return fmt.Errorf("%w: %w", ErrClosed, err)
	}
	if _, err := c.transport.Write(body); err != nil {
		return fmt.Errorf("%w: %w", ErrClosed, err)
	}
	return nil
}

func (c *Conn) read() {
	reader := bufio.NewReader(c.transport)
	for {
		body, err := readFrame(reader)
		if err != nil {
			c.shutdown(err)
			c.transport.Kill()
			io.Copy(io.Discard, reader)
			return
		}
		var message incoming
		if err := json.Unmarshal(body, &message, lenient...); err != nil {
			continue
		}
		c.dispatch(message)
	}
}

func (c *Conn) dispatch(message incoming) {
	switch {
	case message.Method != "" && len(message.ID) == 0:
		c.notified(message.Method, message.Params)
	case message.Method != "" && len(message.ID) > 0:
		go c.answer(message)
	case message.Method == "" && len(message.ID) > 0:
		id, err := strconv.ParseInt(string(message.ID), 10, 64)
		if err != nil {
			return
		}
		c.mu.Lock()
		replies, ok := c.pending[id]
		c.mu.Unlock()
		if !ok {
			return
		}
		if message.Error != nil {
			replies <- reply{err: message.Error}
			return
		}
		replies <- reply{result: message.Result}
	}
}

func (c *Conn) answer(message incoming) {
	result, err := c.handle(message.Method, message.Params)
	if err != nil {
		c.send(outgoingError{JSONRPC: "2.0", ID: message.ID, Error: &ResponseError{Code: methodNotFound, Message: err.Error()}})
		return
	}
	c.send(outgoingResult{JSONRPC: "2.0", ID: message.ID, Result: result})
}

func (c *Conn) shutdown(cause error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.closeErr != nil {
		return
	}
	if transportErr := c.transport.Err(); transportErr != nil {
		cause = transportErr
	}
	c.closeErr = fmt.Errorf("%w: %w", ErrClosed, cause)
	close(c.closed)
}

func readFrame(reader *bufio.Reader) ([]byte, error) {
	length := -1
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			return nil, err
		}
		line = strings.TrimRight(line, "\r\n")
		if line == "" {
			break
		}
		name, value, found := strings.Cut(line, ":")
		if found && strings.EqualFold(strings.TrimSpace(name), "Content-Length") {
			length, err = strconv.Atoi(strings.TrimSpace(value))
			if err != nil {
				return nil, fmt.Errorf("invalid Content-Length %q", value)
			}
		}
	}
	if length < 0 || length > maxFrameSize {
		return nil, fmt.Errorf("invalid Content-Length %d", length)
	}
	body := make([]byte, length)
	_, err := io.ReadFull(reader, body)
	return body, err
}
