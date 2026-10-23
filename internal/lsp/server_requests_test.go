package lsp

import (
	"context"
	"fmt"
	"net"
	"testing"
	"testing/synctest"
	"time"

	"github.com/obsfx/oversee/internal/lsp/lsptest"
)

func (p *peer) handshake() error {
	request, err := p.next()
	if err != nil {
		return err
	}
	if request.Method != "initialize" {
		return fmt.Errorf("first message is %s, want initialize", request.Method)
	}
	if err := p.write(lsptest.Frame(fmt.Sprintf(`{"jsonrpc":"2.0","id":%s,"result":{"capabilities":{}}}`, request.ID))); err != nil {
		return err
	}
	initialized, err := p.next()
	if err != nil {
		return err
	}
	if initialized.Method != "initialized" {
		return fmt.Errorf("second message is %s, want initialized", initialized.Method)
	}
	return nil
}

func startPeerClient(t *testing.T) (*Client, *peer) {
	t.Helper()
	clientEnd, serverEnd := net.Pipe()
	transport := lsptest.NewPipeTransport(clientEnd)
	server := newPeer(serverEnd)
	t.Cleanup(func() {
		transport.Kill()
		serverEnd.Close()
	})
	handshake := make(chan error, 1)
	go func() {
		handshake <- server.handshake()
	}()
	ctx, cancel := context.WithTimeout(t.Context(), testTimeout)
	defer cancel()
	client, err := Start(ctx, transport, testRoot, nil)
	if err != nil {
		t.Fatalf("start client: %v", err)
	}
	if err := <-handshake; err != nil {
		t.Fatalf("handshake: %v", err)
	}
	return client, server
}

func TestClientAnswersServerRequests(t *testing.T) {
	tests := []struct {
		name       string
		method     string
		params     string
		wantResult string
		wantError  bool
	}{
		{
			name:       "configuration answers null for every item",
			method:     "workspace/configuration",
			params:     `{"items":[{"section":"gopls"},{"scopeUri":"file:///repo","section":"go"},{}]}`,
			wantResult: `[null,null,null]`,
		},
		{
			name:       "configuration without items",
			method:     "workspace/configuration",
			params:     `{"items":[]}`,
			wantResult: `[]`,
		},
		{
			name:      "configuration with unreadable params",
			method:    "workspace/configuration",
			params:    `{"items":7}`,
			wantError: true,
		},
		{
			name:       "workspace folders name the root",
			method:     "workspace/workspaceFolders",
			wantResult: `[{"name":"repo","uri":"file:///repo"}]`,
		},
		{
			name:       "edits are never applied",
			method:     "workspace/applyEdit",
			params:     `{"edit":{"changes":{"file:///repo/a.go":[]}}}`,
			wantResult: `{"applied":false}`,
		},
		{
			name:       "capability registration",
			method:     "client/registerCapability",
			params:     `{"registrations":[{"id":"1","method":"workspace/didChangeWatchedFiles"}]}`,
			wantResult: `null`,
		},
		{
			name:       "capability unregistration",
			method:     "client/unregisterCapability",
			params:     `{"unregisterations":[{"id":"1","method":"workspace/didChangeWatchedFiles"}]}`,
			wantResult: `null`,
		},
		{
			name:       "work done progress creation",
			method:     "window/workDoneProgress/create",
			params:     `{"token":"index"}`,
			wantResult: `null`,
		},
		{
			name:       "message requests",
			method:     "window/showMessageRequest",
			params:     `{"type":1,"message":"Pick one","actions":[{"title":"Yes"}]}`,
			wantResult: `null`,
		},
		{
			name:      "any other request",
			method:    "workspace/codeLens/refresh",
			wantError: true,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			client, server := startPeerClient(t)
			request := `{"jsonrpc":"2.0","id":41,"method":"` + test.method + `"`
			if test.params != "" {
				request += `,"params":` + test.params
			}
			server.send(t, lsptest.Frame(request+"}"))
			response := server.receive(t)
			if string(response.ID) != "41" {
				t.Fatalf("response id = %s, want 41", response.ID)
			}
			if test.wantError {
				if response.Error == nil || response.Error.Code != -32601 || len(response.Result) != 0 {
					t.Fatalf("response = %+v, want a -32601 error", response)
				}
				return
			}
			if response.Error != nil || len(response.Result) == 0 {
				t.Fatalf("response = %+v, want a result", response)
			}
			if got := canonicalJSON(t, response.Result); got != test.wantResult {
				t.Fatalf("result = %s, want %s", response.Result, test.wantResult)
			}
			if client.Err() != nil {
				t.Fatalf("the connection broke: %v", client.Err())
			}
		})
	}
}

func progress(token, kind, message string) string {
	return lsptest.Frame(fmt.Sprintf(`{"jsonrpc":"2.0","method":"$/progress","params":{"token":%s,"value":{"kind":%q,"title":"Indexing","message":"%s"}}}`, token, kind, message))
}

func TestClientIndexingFollowsTheWarmupAndProgress(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		client, server := startPeerClient(t)
		steps := []struct {
			name    string
			advance time.Duration
			send    string
			want    bool
		}{
			{name: "a session that just started", want: true},
			{name: "a session just before 20 seconds", advance: 20*time.Second - time.Millisecond, want: true},
			{name: "a session at 20 seconds without progress", advance: time.Millisecond, want: false},
			{name: "a begun string token", send: progress(`"index"`, "begin", "files"), want: true},
			{name: "a begun number token", send: progress(`7`, "begin", "packages"), want: true},
			{name: "a report of a begun token", send: progress(`7`, "report", "3/9"), want: true},
			{name: "the end of one of two tokens", send: progress(`"index"`, "end", "done"), want: true},
			{name: "the end of the last token", send: progress(`7`, "end", "done"), want: false},
			{name: "a report without a begin", send: progress(`"late"`, "report", "1/2"), want: false},
			{name: "an end without a begin", send: progress(`"never"`, "end", "done"), want: false},
			{name: "a progress value that is not an object", send: lsptest.Frame(`{"jsonrpc":"2.0","method":"$/progress","params":{"token":"index","value":"begin"}}`), want: false},
			{name: "another notification", send: lsptest.Frame(`{"jsonrpc":"2.0","method":"window/logMessage","params":{"type":3,"message":"begin"}}`), want: false},
		}
		for _, step := range steps {
			time.Sleep(step.advance)
			if step.send != "" {
				server.send(t, step.send)
			}
			synctest.Wait()
			if got := client.Indexing(); got != step.want {
				t.Fatalf("%s: Indexing() = %t, want %t", step.name, got, step.want)
			}
		}
	})
}

func TestClientIndexingEndsForProgressWithInvalidUTF8(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		client, server := startPeerClient(t)
		time.Sleep(warmup)
		server.send(t, progress(`"index"`, "begin", "files"))
		synctest.Wait()
		if !client.Indexing() {
			t.Fatalf("Indexing() = false after a begin")
		}
		server.send(t, progress(`"index"`, "end", "caf\xe9.go"))
		synctest.Wait()
		if client.Indexing() {
			t.Fatalf("Indexing() = true after the end of the only token")
		}
	})
}

func TestClientAnswersConfigurationWithInvalidUTF8(t *testing.T) {
	client, server := startPeerClient(t)
	server.send(t, lsptest.Frame("{\"jsonrpc\":\"2.0\",\"id\":5,\"method\":\"workspace/configuration\",\"params\":{\"items\":[{\"scopeUri\":\"file:///repo/caf\xe9\"}]}}"))
	response := server.receive(t)
	if response.Error != nil || string(response.Result) != `[null]` {
		t.Fatalf("response = %+v, want [null]", response)
	}
	if client.Err() != nil {
		t.Fatalf("the connection broke: %v", client.Err())
	}
}
