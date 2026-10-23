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
	conn         *Conn
	transport    Transport
	root         string
	startedAt    time.Time
	slot         chan struct{}
	documents    map[string]*openDocument
	replaced     uint64
	progress     sync.Map
	capabilities Capabilities
}

type openDocument struct {
	text    string
	version int
	users   int
}

type Document struct {
	Path       string
	LanguageID string
	Text       string
}

func Start(ctx context.Context, transport Transport, root string, initializationOptions map[string]any) (*Client, error) {
	client := &Client{transport: transport, root: root, startedAt: time.Now(), slot: make(chan struct{}, 1), documents: map[string]*openDocument{}}
	client.conn = NewConn(transport, client.handle, client.notified)
	params := initializeParams{
		ProcessID:             os.Getpid(),
		ClientInfo:            clientInfo{Name: "oversee"},
		RootURI:               FileURI(root),
		RootPath:              root,
		WorkspaceFolders:      []workspaceFolder{client.folder()},
		Capabilities:          clientCapabilities,
		InitializationOptions: initializationOptions,
	}
	var initialized initializeResult
	if err := client.conn.Call(ctx, "initialize", params, &initialized); err != nil {
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
	client.capabilities = initialized.capabilities()
	return client, nil
}

func (c *Client) Capabilities() Capabilities {
	return c.capabilities
}

func (c *Client) Batch(ctx context.Context, documents []Document, work func(batch *Batch) error) error {
	batch := &Batch{ctx: ctx, client: c, texts: map[string]string{}}
	defer batch.close()
	if err := batch.open(documents); err != nil {
		return err
	}
	return work(batch)
}

func (c *Client) Definition(ctx context.Context, document Document, position Position) ([]Location, error) {
	release, err := c.acquire(ctx)
	if err != nil {
		return nil, err
	}
	defer release()
	restore, err := c.show(document)
	defer restore()
	if err != nil {
		return nil, err
	}
	var raw jsontext.Value
	if err := c.conn.Call(ctx, "textDocument/definition", position.in(document.Path), &raw); err != nil {
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

func (c *Client) acquire(ctx context.Context) (func(), error) {
	select {
	case c.slot <- struct{}{}:
	case <-ctx.Done():
		return nil, ctx.Err()
	}
	if err := ctx.Err(); err != nil {
		<-c.slot
		return nil, err
	}
	return c.leave, nil
}

func (c *Client) wait() func() {
	c.slot <- struct{}{}
	return c.leave
}

func (c *Client) leave() {
	<-c.slot
}

func (c *Client) hold(uri string, document Document) error {
	current, open := c.documents[uri]
	if !open {
		c.documents[uri] = &openDocument{text: document.Text, version: 1, users: 1}
		item := textDocumentItem{URI: uri, LanguageID: document.LanguageID, Version: 1, Text: document.Text}
		return c.conn.Notify("textDocument/didOpen", didOpenParams{TextDocument: item})
	}
	current.users++
	return c.replace(uri, current, document.Text)
}

func (c *Client) replace(uri string, document *openDocument, text string) error {
	if document.text == text {
		return nil
	}
	c.replaced++
	return c.change(uri, document, text)
}

func (c *Client) change(uri string, document *openDocument, text string) error {
	document.text = text
	document.version++
	return c.conn.Notify("textDocument/didChange", didChangeParams{
		TextDocument:   versionedTextDocumentIdentifier{URI: uri, Version: document.version},
		ContentChanges: []contentChange{{Text: text}},
	})
}

func (c *Client) release(uri string) {
	current := c.documents[uri]
	current.users--
	if current.users > 0 {
		return
	}
	delete(c.documents, uri)
	c.conn.Notify("textDocument/didClose", didCloseParams{TextDocument: textDocumentIdentifier{URI: uri}})
}

func (c *Client) show(document Document) (func(), error) {
	uri := FileURI(document.Path)
	current, open := c.documents[uri]
	if !open || current.text == document.Text {
		err := c.hold(uri, document)
		return func() { c.release(uri) }, err
	}
	previous := current.text
	err := c.change(uri, current, document.Text)
	return func() { c.change(uri, current, previous) }, err
}

func (c *Client) folder() workspaceFolder {
	return workspaceFolder{URI: FileURI(c.root), Name: filepath.Base(c.root)}
}

func (c *Client) notified(method string, params jsontext.Value) {
	if method != "$/progress" {
		return
	}
	var notification progressParams
	if err := json.Unmarshal(params, &notification, lenient...); err != nil {
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
		if err := json.Unmarshal(params, &request, lenient...); err != nil {
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
