package lsp

import (
	"context"
	"encoding/json/jsontext"
	"encoding/json/v2"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

const warmup = 20 * time.Second

type Client struct {
	conn      *Conn
	transport Transport
	root      string
	startedAt time.Time
	slot      chan struct{}
	progress  sync.Map
}

type Document struct {
	Path       string
	LanguageID string
	Text       string
}

func Start(ctx context.Context, transport Transport, root string) (*Client, error) {
	client := &Client{transport: transport, root: root, startedAt: time.Now(), slot: make(chan struct{}, 1)}
	client.conn = NewConn(transport, client.handle, client.notified)
	params := initializeParams{
		ProcessID:        os.Getpid(),
		ClientInfo:       clientInfo{Name: "oversee"},
		RootURI:          FileURI(root),
		RootPath:         root,
		WorkspaceFolders: []workspaceFolder{client.folder()},
		Capabilities:     clientCapabilities,
	}
	if err := client.conn.Call(ctx, "initialize", params, nil); err != nil {
		transport.Kill()
		if ctx.Err() != nil {
			err = context.Cause(ctx)
		}
		return nil, fmt.Errorf("initialize: %w", err)
	}
	if err := client.conn.Notify("initialized", struct{}{}); err != nil {
		transport.Kill()
		return nil, err
	}
	return client, nil
}

func (c *Client) Definition(ctx context.Context, document Document, position Position) ([]Location, error) {
	select {
	case c.slot <- struct{}{}:
	case <-ctx.Done():
		return nil, ctx.Err()
	}
	defer func() { <-c.slot }()
	uri := FileURI(document.Path)
	item := textDocumentItem{URI: uri, LanguageID: document.LanguageID, Version: 1, Text: document.Text}
	if err := c.conn.Notify("textDocument/didOpen", didOpenParams{TextDocument: item}); err != nil {
		return nil, err
	}
	defer c.conn.Notify("textDocument/didClose", didCloseParams{TextDocument: textDocumentIdentifier{URI: uri}})
	var raw jsontext.Value
	params := positionParams{TextDocument: textDocumentIdentifier{URI: uri}, Position: position}
	if err := c.conn.Call(ctx, "textDocument/definition", params, &raw); err != nil {
		return nil, err
	}
	return parseLocations(raw)
}

func (c *Client) FilesChanged(events []FileEvent) error {
	return c.conn.Notify("workspace/didChangeWatchedFiles", didChangeWatchedFilesParams{Changes: events})
}

func (c *Client) Indexing() bool {
	if time.Since(c.startedAt) < warmup {
		return true
	}
	active := false
	c.progress.Range(func(_, _ any) bool {
		active = true
		return false
	})
	return active
}

func (c *Client) Done() <-chan struct{} {
	return c.conn.Done()
}

func (c *Client) Err() error {
	return c.conn.Err()
}

func (c *Client) Shutdown(ctx context.Context) {
	stop := context.AfterFunc(ctx, c.transport.Kill)
	defer stop()
	if err := c.conn.Call(ctx, "shutdown", nil, nil); err == nil {
		c.conn.Notify("exit", nil)
	}
	c.transport.Close()
	select {
	case <-c.transport.Done():
	case <-ctx.Done():
	}
}

func (c *Client) folder() workspaceFolder {
	return workspaceFolder{URI: FileURI(c.root), Name: filepath.Base(c.root)}
}

func (c *Client) notified(method string, params jsontext.Value) {
	if method != "$/progress" {
		return
	}
	var notification progressParams
	if err := json.Unmarshal(params, &notification); err != nil {
		return
	}
	token := string(notification.Token)
	switch notification.Value.Kind {
	case "begin":
		c.progress.Store(token, true)
	case "end":
		c.progress.Delete(token)
	}
}

func (c *Client) handle(method string, params jsontext.Value) (any, error) {
	switch method {
	case "workspace/configuration":
		var request configurationParams
		if err := json.Unmarshal(params, &request); err != nil {
			return nil, err
		}
		return make([]any, len(request.Items)), nil
	case "workspace/workspaceFolders":
		return []workspaceFolder{c.folder()}, nil
	case "workspace/applyEdit":
		return map[string]bool{"applied": false}, nil
	case "client/registerCapability", "client/unregisterCapability", "window/workDoneProgress/create", "window/showMessageRequest":
		return nil, nil
	default:
		return nil, fmt.Errorf("%s is not supported", method)
	}
}
