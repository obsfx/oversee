package lsp

import (
	"bufio"
	"context"
	"encoding/json/jsontext"
	"encoding/json/v2"
	"fmt"
	"net"
	"sync"
	"testing"
	"time"

	"github.com/obsfx/oversee/internal/lsp/lsptest"
)

const (
	testTimeout = 5 * time.Second
	flushMethod = "oversee-test/flush"
	testRoot    = "/repo"
)

type recordedMessage struct {
	ID     jsontext.Value `json:"id"`
	Method string         `json:"method"`
	Params jsontext.Value `json:"params"`
}

func (m recordedMessage) isRequest() bool {
	return len(m.ID) > 0
}

type sentPosition struct {
	Line      int `json:"line"`
	Character int `json:"character"`
}

type sentParams struct {
	TextDocument struct {
		URI        string `json:"uri"`
		LanguageID string `json:"languageId"`
		Version    int    `json:"version"`
		Text       string `json:"text"`
	} `json:"textDocument"`
	Position *sentPosition `json:"position"`
	Context  *struct {
		IncludeDeclaration *bool `json:"includeDeclaration"`
	} `json:"context"`
	Item           jsontext.Value `json:"item"`
	ContentChanges []struct {
		Text string `json:"text"`
	} `json:"contentChanges"`
}

func (m recordedMessage) params(t *testing.T) sentParams {
	t.Helper()
	var params sentParams
	if len(m.Params) == 0 {
		return params
	}
	if err := json.Unmarshal(m.Params, &params); err != nil {
		t.Fatalf("decode %s params: %v", m.Method, err)
	}
	return params
}

func (m recordedMessage) step(t *testing.T) string {
	t.Helper()
	return m.Method + " " + m.params(t).TextDocument.URI
}

type fakeServer struct {
	conn     net.Conn
	results  map[string]string
	failures map[string]string
	silent   map[string]bool
	stopped  chan struct{}
	mu       sync.Mutex
	received []recordedMessage
}

func (s *fakeServer) serve() {
	defer close(s.stopped)
	reader := bufio.NewReader(s.conn)
	for {
		body, err := readFrame(reader)
		if err != nil {
			return
		}
		var message recordedMessage
		if err := json.Unmarshal(body, &message); err != nil {
			return
		}
		s.mu.Lock()
		s.received = append(s.received, message)
		s.mu.Unlock()
		if !message.isRequest() || s.silent[message.Method] {
			continue
		}
		if err := s.answer(message); err != nil {
			return
		}
	}
}

func (s *fakeServer) answer(request recordedMessage) error {
	result, found := s.results[request.Method]
	if !found {
		result = "null"
	}
	body := fmt.Sprintf(`{"jsonrpc":"2.0","id":%s,"result":%s}`, request.ID, result)
	if failure, failed := s.failures[request.Method]; failed {
		body = fmt.Sprintf(`{"jsonrpc":"2.0","id":%s,"error":%s}`, request.ID, failure)
	}
	return lsptest.WriteFrame(s.conn, []byte(body))
}

func (s *fakeServer) methods() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	methods := make([]string, 0, len(s.received))
	for _, message := range s.received {
		methods = append(methods, message.Method)
	}
	return methods
}

func (s *fakeServer) messages(t *testing.T, client *Client) []recordedMessage {
	t.Helper()
	ctx, cancel := context.WithTimeout(t.Context(), testTimeout)
	defer cancel()
	if err := client.conn.Call(ctx, flushMethod, nil, nil); err != nil {
		t.Fatalf("flush fake server: %v", err)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	var messages []recordedMessage
	for _, message := range s.received {
		if message.Method != flushMethod {
			messages = append(messages, message)
		}
	}
	return messages
}

func (s *fakeServer) messagesSinceStart(t *testing.T, client *Client) []recordedMessage {
	t.Helper()
	var messages []recordedMessage
	for _, message := range s.messages(t, client) {
		if message.Method != "initialize" && message.Method != "initialized" {
			messages = append(messages, message)
		}
	}
	return messages
}

func startFakeClient(t *testing.T, results map[string]string) (*Client, *fakeServer) {
	t.Helper()
	return startFailingFakeClient(t, results, nil)
}

func startFailingFakeClient(t *testing.T, results, failures map[string]string) (*Client, *fakeServer) {
	t.Helper()
	clientEnd, serverEnd := net.Pipe()
	transport := lsptest.NewPipeTransport(clientEnd)
	server := &fakeServer{conn: serverEnd, results: results, failures: failures, stopped: make(chan struct{})}
	go server.serve()
	t.Cleanup(func() {
		transport.Kill()
		serverEnd.Close()
		<-server.stopped
	})
	ctx, cancel := context.WithTimeout(t.Context(), testTimeout)
	defer cancel()
	client, err := Start(ctx, transport, testRoot, nil)
	if err != nil {
		t.Fatalf("start client: %v", err)
	}
	return client, server
}

func runBatch[T any](t *testing.T, client *Client, documents []Document, work func(batch *Batch) (T, error)) T {
	t.Helper()
	ctx, cancel := context.WithTimeout(t.Context(), testTimeout)
	defer cancel()
	var result T
	err := client.Batch(ctx, documents, func(batch *Batch) error {
		var workErr error
		result, workErr = work(batch)
		return workErr
	})
	if err != nil {
		t.Fatalf("batch: %v", err)
	}
	return result
}

func rangeOf(startLine, startCharacter, endLine, endCharacter int) Range {
	return Range{
		Start: Position{Line: startLine, Character: startCharacter},
		End:   Position{Line: endLine, Character: endCharacter},
	}
}

func canonicalJSON(t *testing.T, value jsontext.Value) string {
	t.Helper()
	canonical := value.Clone()
	if err := canonical.Canonicalize(); err != nil {
		t.Fatalf("canonicalize %s: %v", value, err)
	}
	return string(canonical)
}
