package lsp

import (
	"bufio"
	"context"
	"encoding/json/jsontext"
	"encoding/json/v2"
	"errors"
	"fmt"
	"io"
	"net"
	"strconv"
	"strings"
	"testing"
	"testing/synctest"
	"time"

	"github.com/obsfx/oversee/internal/lsp/lsptest"
)

type peerMessage struct {
	JSONRPC string         `json:"jsonrpc"`
	ID      jsontext.Value `json:"id"`
	Method  string         `json:"method"`
	Params  jsontext.Value `json:"params"`
	Result  jsontext.Value `json:"result"`
	Error   *ResponseError `json:"error"`
}

type peer struct {
	conn   net.Conn
	reader *bufio.Reader
}

func newPeer(conn net.Conn) *peer {
	return &peer{conn: conn, reader: bufio.NewReader(conn)}
}

func (p *peer) write(chunks ...string) error {
	for _, chunk := range chunks {
		if err := p.conn.SetWriteDeadline(time.Now().Add(testTimeout)); err != nil {
			return err
		}
		if _, err := io.WriteString(p.conn, chunk); err != nil {
			return err
		}
	}
	return nil
}

func (p *peer) next() (peerMessage, error) {
	if err := p.conn.SetReadDeadline(time.Now().Add(testTimeout)); err != nil {
		return peerMessage{}, err
	}
	body, err := lsptest.ReadFrame(p.reader)
	if err != nil {
		return peerMessage{}, err
	}
	var message peerMessage
	if err := json.Unmarshal(body, &message); err != nil {
		return peerMessage{}, fmt.Errorf("decode %q: %w", body, err)
	}
	return message, nil
}

func (p *peer) send(t *testing.T, chunks ...string) {
	t.Helper()
	if err := p.write(chunks...); err != nil {
		t.Fatalf("peer write: %v", err)
	}
}

func (p *peer) receive(t *testing.T) peerMessage {
	t.Helper()
	message, err := p.next()
	if err != nil {
		t.Fatalf("peer read: %v", err)
	}
	return message
}

func (p *peer) reply(t *testing.T, request peerMessage, member string) {
	t.Helper()
	p.send(t, lsptest.Frame(fmt.Sprintf(`{"jsonrpc":"2.0","id":%s,%s}`, request.ID, member)))
}

type notice struct {
	method string
	params string
}

type connHarness struct {
	conn      *Conn
	transport Transport
	peer      *peer
	notices   chan notice
}

func unsupported(method string, _ jsontext.Value) (any, error) {
	return nil, fmt.Errorf("%s is not supported", method)
}

func newConnHarness(t *testing.T, handle RequestHandler) *connHarness {
	t.Helper()
	clientEnd, serverEnd := net.Pipe()
	return startConnHarness(t, lsptest.NewPipeTransport(clientEnd), serverEnd, handle)
}

func startConnHarness(t *testing.T, transport Transport, serverEnd net.Conn, handle RequestHandler) *connHarness {
	t.Helper()
	harness := &connHarness{transport: transport, peer: newPeer(serverEnd), notices: make(chan notice, 64)}
	harness.conn = NewConn(transport, handle, func(method string, params jsontext.Value) {
		harness.notices <- notice{method: method, params: string(params)}
	})
	t.Cleanup(func() {
		transport.Kill()
		serverEnd.Close()
		<-harness.conn.Done()
	})
	return harness
}

type callResult struct {
	value string
	err   error
}

func (h *connHarness) call(ctx context.Context, method string, params any) <-chan callResult {
	results := make(chan callResult, 1)
	go func() {
		var value string
		err := h.conn.Call(ctx, method, params, &value)
		results <- callResult{value: value, err: err}
	}()
	return results
}

func (h *connHarness) expectNotices(t *testing.T, want ...notice) {
	t.Helper()
	for _, expected := range want {
		if got := await(t, h.notices); got != expected {
			t.Fatalf("notification = %+v, want %+v", got, expected)
		}
	}
}

func await[T any](t *testing.T, values <-chan T) T {
	t.Helper()
	select {
	case value := <-values:
		return value
	case <-time.After(testTimeout):
		t.Fatalf("nothing arrived within %s", testTimeout)
		var zero T
		return zero
	}
}

func closed(done <-chan struct{}) bool {
	select {
	case <-done:
		return true
	default:
		return false
	}
}

func splitAt(text string, offsets ...int) []string {
	chunks := make([]string, 0, len(offsets)+1)
	start := 0
	for _, offset := range offsets {
		chunks = append(chunks, text[start:offset])
		start = offset
	}
	return append(chunks, text[start:])
}

func TestConnReadsFramesHoweverTheReadsSplitThem(t *testing.T) {
	bodies := []string{
		`{"jsonrpc":"2.0","method":"note/first","params":{"n":1}}`,
		`{"jsonrpc":"2.0","method":"note/second","params":{"text":"Content-Length: 99"}}`,
		`{"jsonrpc":"2.0","method":"note/third","params":[3]}`,
	}
	stream := lsptest.Frame(bodies[0]) + lsptest.Frame(bodies[1]) + lsptest.Frame(bodies[2])
	headerEnd := len(lsptest.Frame(bodies[0])) - len(bodies[0])
	firstEnd := len(lsptest.Frame(bodies[0]))
	tests := []struct {
		name   string
		chunks []string
	}{
		{
			name:   "one frame per read",
			chunks: []string{lsptest.Frame(bodies[0]), lsptest.Frame(bodies[1]), lsptest.Frame(bodies[2])},
		},
		{
			name:   "every frame in one read",
			chunks: []string{stream},
		},
		{
			name:   "reads that end inside the header name, the length, the blank line and the body",
			chunks: splitAt(stream, 3, 17, headerEnd-1, headerEnd+5, firstEnd+8),
		},
		{
			name:   "one byte per read",
			chunks: strings.Split(stream, ""),
		},
		{
			name: "headers in any case, with other fields and loose spaces",
			chunks: []string{
				"Content-Type: application/vscode-jsonrpc; charset=utf-8\r\ncontent-length: " + strconv.Itoa(len(bodies[0])) + "\r\n\r\n" + bodies[0],
				"CONTENT-LENGTH:" + strconv.Itoa(len(bodies[1])) + "  \r\n\r\n" + bodies[1],
				"Content-Length :  " + strconv.Itoa(len(bodies[2])) + "\r\nX-Trace: 1\r\n\r\n" + bodies[2],
			},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			harness := newConnHarness(t, unsupported)
			harness.peer.send(t, test.chunks...)
			harness.expectNotices(t,
				notice{method: "note/first", params: `{"n":1}`},
				notice{method: "note/second", params: `{"text":"Content-Length: 99"}`},
				notice{method: "note/third", params: `[3]`},
			)
		})
	}
}

type emptyBytes struct{}

func (emptyBytes) Read(buffer []byte) (int, error) {
	clear(buffer)
	return len(buffer), nil
}

func TestReadFrameAcceptsBodiesUpTo64MiB(t *testing.T) {
	const limit = 64 << 20
	tests := []struct {
		name    string
		length  int
		wantErr bool
	}{
		{name: "a body of exactly 64 MiB", length: limit},
		{name: "a body one byte over 64 MiB", length: limit + 1, wantErr: true},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			header := fmt.Sprintf("Content-Length: %d\r\n\r\n", test.length)
			reader := bufio.NewReader(io.MultiReader(strings.NewReader(header), io.LimitReader(emptyBytes{}, int64(test.length))))
			body, err := readFrame(reader)
			if test.wantErr {
				if err == nil {
					t.Fatalf("readFrame() read %d bytes, want an error", len(body))
				}
				return
			}
			if err != nil {
				t.Fatalf("readFrame() error = %v", err)
			}
			if len(body) != test.length {
				t.Fatalf("readFrame() read %d bytes, want %d", len(body), test.length)
			}
		})
	}
}

func TestConnTreatsAnUnreadableFrameAsABrokenConnection(t *testing.T) {
	tests := []struct {
		name   string
		header string
	}{
		{name: "a frame over 64 MiB", header: "Content-Length: 67108865\r\n\r\n"},
		{name: "a frame without a length", header: "Content-Type: application/json\r\n\r\n{}"},
		{name: "a length that is not a number", header: "Content-Length: many\r\n\r\n{}"},
		{name: "a negative length", header: "Content-Length: -2\r\n\r\n{}"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			harness := newConnHarness(t, unsupported)
			pending := harness.call(t.Context(), "pending", nil)
			harness.peer.receive(t)
			harness.peer.send(t, test.header)
			if result := await(t, pending); !errors.Is(result.err, ErrClosed) {
				t.Fatalf("pending Call() error = %v, want ErrClosed", result.err)
			}
			await(t, harness.conn.Done())
			await(t, harness.transport.Done())
			if err := harness.conn.Err(); !errors.Is(err, ErrClosed) {
				t.Fatalf("Err() = %v, want ErrClosed", err)
			}
			if err := harness.conn.Call(t.Context(), "later", nil, nil); !errors.Is(err, ErrClosed) {
				t.Fatalf("later Call() error = %v, want ErrClosed", err)
			}
			if err := harness.conn.Notify("later", nil); !errors.Is(err, ErrClosed) {
				t.Fatalf("later Notify() error = %v, want ErrClosed", err)
			}
		})
	}
}

var errServerExited = errors.New("exit status 3")

type exitedTransport struct {
	*lsptest.PipeTransport
	exit error
}

func (e exitedTransport) Err() error {
	return e.exit
}

func TestConnFailsPendingCallsWhenTheTransportCloses(t *testing.T) {
	tests := []struct {
		name      string
		exit      error
		wantCause error
	}{
		{name: "the server closes its end", wantCause: io.EOF},
		{name: "the server process exits with an error", exit: errServerExited, wantCause: errServerExited},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			clientEnd, serverEnd := net.Pipe()
			transport := exitedTransport{PipeTransport: lsptest.NewPipeTransport(clientEnd), exit: test.exit}
			harness := startConnHarness(t, transport, serverEnd, unsupported)
			first := harness.call(t.Context(), "first", nil)
			second := harness.call(t.Context(), "second", nil)
			harness.peer.receive(t)
			harness.peer.receive(t)
			serverEnd.Close()
			for _, pending := range []<-chan callResult{first, second} {
				result := await(t, pending)
				if !errors.Is(result.err, ErrClosed) || !errors.Is(result.err, test.wantCause) {
					t.Fatalf("pending Call() error = %v, want ErrClosed caused by %v", result.err, test.wantCause)
				}
			}
			await(t, harness.conn.Done())
			if err := harness.conn.Err(); !errors.Is(err, test.wantCause) {
				t.Fatalf("Err() = %v, want a cause of %v", err, test.wantCause)
			}
			await(t, transport.Done())
			if err := harness.conn.Call(t.Context(), "later", nil, nil); !errors.Is(err, ErrClosed) {
				t.Fatalf("later Call() error = %v, want ErrClosed", err)
			}
		})
	}
}

func TestConnMatchesResponsesToTheirRequests(t *testing.T) {
	harness := newConnHarness(t, unsupported)
	calls := map[string]<-chan callResult{
		"first":  harness.call(t.Context(), "first", nil),
		"second": harness.call(t.Context(), "second", nil),
	}
	requests := []peerMessage{harness.peer.receive(t), harness.peer.receive(t)}
	if string(requests[0].ID) == string(requests[1].ID) {
		t.Fatalf("both requests use id %s", requests[0].ID)
	}
	harness.peer.send(t,
		lsptest.Frame(`{"jsonrpc":"2.0","id":999,"result":"unknown id"}`),
		lsptest.Frame(`{"jsonrpc":"2.0","id":"`+string(requests[0].ID)+`","result":"string id"}`),
		lsptest.Frame(`{"jsonrpc":"2.0","result":"no id"}`),
		lsptest.Frame(`not json`),
	)
	harness.peer.reply(t, requests[1], fmt.Sprintf(`"result":%q`, requests[1].Method))
	harness.peer.reply(t, requests[0], fmt.Sprintf(`"result":%q`, requests[0].Method))
	for method, pending := range calls {
		result := await(t, pending)
		if result.err != nil || result.value != method {
			t.Errorf("Call(%s) = %q, %v, want %q", method, result.value, result.err, method)
		}
	}
}

func TestConnCallDecodesTheResponse(t *testing.T) {
	type answer struct {
		Name string `json:"name"`
	}
	tests := []struct {
		name       string
		params     any
		target     *answer
		response   string
		want       *answer
		wantParams string
		wantErr    func(error) bool
	}{
		{
			name:       "a result",
			params:     map[string]int{"line": 4},
			target:     &answer{},
			response:   `"result":{"name":"Serve","extra":true}`,
			want:       &answer{Name: "Serve"},
			wantParams: `{"line":4}`,
		},
		{
			name:     "a null result decodes to the zero value",
			target:   &answer{Name: "before"},
			response: `"result":null`,
			want:     &answer{},
		},
		{
			name:     "a result the caller does not want",
			response: `"result":{"name":"ignored"}`,
		},
		{
			name:     "an error",
			target:   &answer{},
			response: `"error":{"code":-32603,"message":"internal"}`,
			want:     &answer{},
			wantErr: func(err error) bool {
				responseErr, ok := errors.AsType[*ResponseError](err)
				return ok && responseErr.Code == -32603 && responseErr.Message == "internal"
			},
		},
		{
			name:     "a result that does not fit the target",
			target:   &answer{},
			response: `"result":["Serve"]`,
			want:     &answer{},
			wantErr: func(err error) bool {
				return err != nil && strings.Contains(err.Error(), "decode probe result")
			},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			harness := newConnHarness(t, unsupported)
			results := make(chan error, 1)
			go func() {
				if test.target == nil {
					results <- harness.conn.Call(t.Context(), "probe", test.params, nil)
					return
				}
				results <- harness.conn.Call(t.Context(), "probe", test.params, test.target)
			}()
			request := harness.peer.receive(t)
			if request.JSONRPC != "2.0" || request.Method != "probe" || len(request.ID) == 0 {
				t.Fatalf("request = %+v, want a 2.0 probe request with an id", request)
			}
			if string(request.Params) != test.wantParams {
				t.Fatalf("request params = %s, want %q", request.Params, test.wantParams)
			}
			harness.peer.reply(t, request, test.response)
			err := await(t, results)
			if test.wantErr == nil && err != nil {
				t.Fatalf("Call() error = %v", err)
			}
			if test.wantErr != nil && !test.wantErr(err) {
				t.Fatalf("Call() error = %v, not the expected error", err)
			}
			if test.target != nil && *test.target != *test.want {
				t.Fatalf("Call() decoded %+v, want %+v", *test.target, *test.want)
			}
		})
	}
}

func TestConnAnswersServerRequests(t *testing.T) {
	errRefused := errors.New("refused")
	tests := []struct {
		name       string
		id         string
		result     any
		err        error
		wantResult string
		wantError  *ResponseError
	}{
		{name: "a result", id: `7`, result: map[string]bool{"ok": true}, wantResult: `{"ok":true}`},
		{name: "an empty result", id: `8`, wantResult: `null`},
		{name: "a string id", id: `"server-1"`, result: []int{1}, wantResult: `[1]`},
		{name: "a refused request", id: `9`, err: errRefused, wantError: &ResponseError{Code: -32601, Message: "refused"}},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			handled := make(chan notice, 1)
			harness := newConnHarness(t, func(method string, params jsontext.Value) (any, error) {
				handled <- notice{method: method, params: string(params)}
				return test.result, test.err
			})
			harness.peer.send(t, lsptest.Frame(`{"jsonrpc":"2.0","id":`+test.id+`,"method":"server/ask","params":{"q":1}}`))
			if got := await(t, handled); got != (notice{method: "server/ask", params: `{"q":1}`}) {
				t.Fatalf("handler got %+v, want server/ask with its params", got)
			}
			response := harness.peer.receive(t)
			if response.JSONRPC != "2.0" || string(response.ID) != test.id || response.Method != "" {
				t.Fatalf("response = %+v, want a 2.0 response to id %s", response, test.id)
			}
			if test.wantError != nil {
				if response.Error == nil || *response.Error != *test.wantError || len(response.Result) != 0 {
					t.Fatalf("response = %+v, want only the error %+v", response, test.wantError)
				}
				return
			}
			if response.Error != nil || string(response.Result) != test.wantResult {
				t.Fatalf("response result = %s, error %v, want %s", response.Result, response.Error, test.wantResult)
			}
		})
	}
}

func TestConnSendsACancelForARequestWhoseContextEnds(t *testing.T) {
	harness := newConnHarness(t, unsupported)
	ctx, cancel := context.WithCancel(t.Context())
	pending := harness.call(ctx, "slow", nil)
	request := harness.peer.receive(t)
	cancel()
	cancelled := harness.peer.receive(t)
	if cancelled.Method != "$/cancelRequest" || len(cancelled.ID) != 0 {
		t.Fatalf("message after the cancel = %+v, want a $/cancelRequest notification", cancelled)
	}
	if want := `{"id":` + string(request.ID) + `}`; string(cancelled.Params) != want {
		t.Fatalf("$/cancelRequest params = %s, want %s", cancelled.Params, want)
	}
	if result := await(t, pending); !errors.Is(result.err, context.Canceled) {
		t.Fatalf("Call() error = %v, want context.Canceled", result.err)
	}
	harness.peer.reply(t, request, `"result":"late"`)
	next := harness.call(t.Context(), "next", nil)
	harness.peer.reply(t, harness.peer.receive(t), `"result":"answered"`)
	if result := await(t, next); result.err != nil || result.value != "answered" {
		t.Fatalf("Call() after a late response = %q, %v, want answered", result.value, result.err)
	}
}

func TestConnSendsNothingForAContextThatAlreadyEnded(t *testing.T) {
	harness := newConnHarness(t, unsupported)
	ctx, cancel := context.WithCancel(t.Context())
	cancel()
	if err := harness.conn.Call(ctx, "never", nil, nil); !errors.Is(err, context.Canceled) {
		t.Fatalf("Call() error = %v, want context.Canceled", err)
	}
	sent := make(chan error, 1)
	go func() {
		sent <- harness.conn.Notify("probe", nil)
	}()
	if message := harness.peer.receive(t); message.Method != "probe" {
		t.Fatalf("first message = %+v, want the probe notification", message)
	}
	if err := await(t, sent); err != nil {
		t.Fatalf("Notify() error = %v", err)
	}
}

func TestConnKillsATransportWhoseWriteBlocksForFiveSeconds(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		harness := newConnHarness(t, unsupported)
		sent := make(chan error, 1)
		go func() {
			sent <- harness.conn.Notify("blocked", nil)
		}()
		time.Sleep(5*time.Second - time.Millisecond)
		synctest.Wait()
		if closed(harness.transport.Done()) || len(sent) > 0 {
			t.Fatalf("the write gave up before five seconds")
		}
		time.Sleep(time.Millisecond)
		synctest.Wait()
		select {
		case err := <-sent:
			if !errors.Is(err, ErrClosed) {
				t.Fatalf("Notify() error = %v, want ErrClosed", err)
			}
		default:
			t.Fatalf("the write is still blocked after five seconds")
		}
		if !closed(harness.transport.Done()) || !closed(harness.conn.Done()) {
			t.Fatalf("the blocked transport and its connection are still alive")
		}
	})
}

func TestConnKeepsATransportWhoseWritesComplete(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		harness := newConnHarness(t, unsupported)
		received := make(chan peerMessage, 1)
		go func() {
			message, _ := harness.peer.next()
			received <- message
		}()
		if err := harness.conn.Notify("quick", nil); err != nil {
			t.Fatalf("Notify() error = %v", err)
		}
		if message := await(t, received); message.Method != "quick" {
			t.Fatalf("peer got %+v, want the quick notification", message)
		}
		time.Sleep(2 * writeTimeout)
		synctest.Wait()
		if closed(harness.transport.Done()) || closed(harness.conn.Done()) {
			t.Fatalf("a completed write killed the transport later")
		}
	})
}

func TestResponseErrorRetryable(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want bool
	}{
		{name: "request cancelled", err: &ResponseError{Code: -32800}, want: true},
		{name: "content modified", err: &ResponseError{Code: -32801}, want: true},
		{name: "server cancelled", err: &ResponseError{Code: -32802}, want: true},
		{name: "a wrapped request cancelled", err: fmt.Errorf("outgoing calls: %w", &ResponseError{Code: -32800}), want: true},
		{name: "internal error", err: &ResponseError{Code: -32603}},
		{name: "method not found", err: &ResponseError{Code: -32601}},
		{name: "request failed", err: &ResponseError{Code: -32803}},
		{name: "a closed connection", err: ErrClosed},
		{name: "no error", err: nil},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := IsRetryable(test.err); got != test.want {
				t.Errorf("IsRetryable(%v) = %t, want %t", test.err, got, test.want)
			}
			if responseErr, ok := errors.AsType[*ResponseError](test.err); ok && responseErr.Retryable() != test.want {
				t.Errorf("(%v).Retryable() = %t, want %t", responseErr, responseErr.Retryable(), test.want)
			}
		})
	}
}

func TestResponseErrorMessage(t *testing.T) {
	err := &ResponseError{Code: -32603, Message: "no package for file"}
	if got, want := err.Error(), "language server error -32603: no package for file"; got != want {
		t.Errorf("Error() = %q, want %q", got, want)
	}
}

func TestConnReplacesInvalidUTF8(t *testing.T) {
	t.Run("in a result", func(t *testing.T) {
		harness := newConnHarness(t, unsupported)
		pending := harness.call(t.Context(), "probe", nil)
		harness.peer.reply(t, harness.peer.receive(t), "\"result\":\"caf\xe9.go\"")
		if result := await(t, pending); result.err != nil || result.value != "caf�.go" {
			t.Fatalf("Call() = %q, %v, want the invalid byte replaced", result.value, result.err)
		}
	})
	t.Run("in an error", func(t *testing.T) {
		harness := newConnHarness(t, unsupported)
		pending := harness.call(t.Context(), "probe", nil)
		harness.peer.reply(t, harness.peer.receive(t), "\"error\":{\"code\":-32603,\"message\":\"no file caf\xe9.go\"}")
		responseErr, ok := errors.AsType[*ResponseError](await(t, pending).err)
		if !ok || responseErr.Message != "no file caf�.go" {
			t.Fatalf("Call() error = %v, want a response error with the invalid byte replaced", responseErr)
		}
	})
	t.Run("in a notification", func(t *testing.T) {
		harness := newConnHarness(t, unsupported)
		harness.peer.send(t, lsptest.Frame("{\"jsonrpc\":\"2.0\",\"method\":\"window/logMessage\",\"params\":{\"message\":\"caf\xe9\"}}"))
		if got := await(t, harness.notices); got.method != "window/logMessage" {
			t.Fatalf("notification = %+v, want the log message", got)
		}
	})
	t.Run("in a sent notification", func(t *testing.T) {
		harness := newConnHarness(t, unsupported)
		sent := make(chan error, 1)
		go func() {
			sent <- harness.conn.Notify("textDocument/didOpen", map[string]string{"text": "caf\xe9"})
		}()
		message := harness.peer.receive(t)
		if err := await(t, sent); err != nil {
			t.Fatalf("Notify() error = %v", err)
		}
		if want := `{"text":"caf` + "�" + `"}`; string(message.Params) != want {
			t.Fatalf("sent params = %s, want %s", message.Params, want)
		}
	})
	t.Run("in a sent answer", func(t *testing.T) {
		harness := newConnHarness(t, func(string, jsontext.Value) (any, error) {
			return "caf\xe9", nil
		})
		harness.peer.send(t, lsptest.Frame(`{"jsonrpc":"2.0","id":3,"method":"server/ask"}`))
		response := harness.peer.receive(t)
		if want := `"caf` + "�" + `"`; string(response.Result) != want {
			t.Fatalf("answer result = %s, want %s", response.Result, want)
		}
	})
}
