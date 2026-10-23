package service

import (
	"bufio"
	"context"
	"encoding/json/jsontext"
	"encoding/json/v2"
	"errors"
	"net"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"testing"

	"github.com/obsfx/oversee/internal/catalog"
	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/langserver"
	"github.com/obsfx/oversee/internal/lsp"
	"github.com/obsfx/oversee/internal/lsp/lsptest"
)

const (
	symbolKindClass     = 5
	symbolKindMethod    = 6
	symbolKindInterface = 11
	symbolKindFunction  = 12
)

type fakeSymbol struct {
	name     string
	kind     int
	start    int
	end      int
	children []fakeSymbol
}

type fakeCall struct {
	key  string
	line int
}

type fakeReference struct {
	path string
	line int
}

type fakeCapabilities struct {
	symbols        bool
	callHierarchy  bool
	implementation bool
	references     bool
}

var allCapabilities = fakeCapabilities{symbols: true, callHierarchy: true, implementation: true, references: true}

type fakeLanguageServer struct {
	root            string
	capabilities    fakeCapabilities
	symbols         map[string][]fakeSymbol
	calls           map[string][]fakeCall
	callers         map[string][]fakeCall
	implementations map[string][]string
	references      map[string][]fakeReference
	emptyPrepare    map[string]bool
	failedPrepare   map[string]bool
	gate            chan struct{}
	mu              sync.Mutex
	requests        map[string]int
	opened          []string
	lookups         []string
	active          int
	peak            int
}

func newFakeLanguageServer(root string) *fakeLanguageServer {
	return &fakeLanguageServer{
		root:            root,
		capabilities:    allCapabilities,
		symbols:         map[string][]fakeSymbol{},
		calls:           map[string][]fakeCall{},
		callers:         map[string][]fakeCall{},
		implementations: map[string][]string{},
		references:      map[string][]fakeReference{},
		emptyPrepare:    map[string]bool{},
		failedPrepare:   map[string]bool{},
		requests:        map[string]int{},
	}
}

func (f *fakeLanguageServer) count(method string) int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.requests[method]
}

func (f *fakeLanguageServer) openedDocuments() []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	return slices.Clone(f.opened)
}

func (f *fakeLanguageServer) implementationLookups() []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	return slices.Sorted(slices.Values(f.lookups))
}

func (f *fakeLanguageServer) symbolRequests() (active, peak int) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.active, f.peak
}

func (f *fakeLanguageServer) enterSymbols() {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.active++
	f.peak = max(f.peak, f.active)
}

func (f *fakeLanguageServer) leaveSymbols() {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.active--
}

func (f *fakeLanguageServer) lookedUp(key string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.lookups = append(f.lookups, key)
}

type fakeMessage struct {
	ID     jsontext.Value `json:"id"`
	Method string         `json:"method"`
	Params jsontext.Value `json:"params"`
}

type fakeTextDocumentParams struct {
	TextDocument struct {
		URI string `json:"uri"`
	} `json:"textDocument"`
	Position struct {
		Line int `json:"line"`
	} `json:"position"`
	Item struct {
		Data string `json:"data"`
	} `json:"item"`
}

func (f *fakeLanguageServer) serve(conn net.Conn) {
	reader := bufio.NewReader(conn)
	for {
		body, err := lsptest.ReadFrame(reader)
		if err != nil {
			return
		}
		var message fakeMessage
		if err := json.Unmarshal(body, &message); err != nil {
			return
		}
		f.record(message)
		if len(message.ID) == 0 {
			continue
		}
		result, failure := f.answer(message)
		reply := map[string]any{"jsonrpc": "2.0", "id": message.ID, "result": result}
		if failure != nil {
			reply = map[string]any{"jsonrpc": "2.0", "id": message.ID, "error": failure}
		}
		response, err := json.Marshal(reply)
		if err != nil {
			return
		}
		if err := lsptest.WriteFrame(conn, response); err != nil {
			return
		}
	}
}

func (f *fakeLanguageServer) record(message fakeMessage) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.requests[message.Method]++
	if message.Method == "textDocument/didOpen" {
		var params fakeTextDocumentParams
		if json.Unmarshal(message.Params, &params) == nil {
			f.opened = append(f.opened, f.relative(params.TextDocument.URI))
		}
	}
}

func (f *fakeLanguageServer) answer(message fakeMessage) (any, *lsp.ResponseError) {
	var params fakeTextDocumentParams
	_ = json.Unmarshal(message.Params, &params)
	switch message.Method {
	case "initialize":
		return map[string]any{"capabilities": map[string]any{
			"documentSymbolProvider": f.capabilities.symbols,
			"callHierarchyProvider":  f.capabilities.callHierarchy,
			"implementationProvider": f.capabilities.implementation,
			"referencesProvider":     f.capabilities.references,
		}}, nil
	case "textDocument/documentSymbol":
		f.enterSymbols()
		defer f.leaveSymbols()
		if f.gate != nil {
			<-f.gate
		}
		return f.documentSymbols(f.symbols[f.relative(params.TextDocument.URI)]), nil
	case "textDocument/prepareCallHierarchy":
		key, found := f.keyAt(f.relative(params.TextDocument.URI), params.Position.Line)
		if !found {
			return nil, nil
		}
		if f.failedPrepare[key] {
			return nil, &lsp.ResponseError{Code: -32603, Message: "prepare failed for " + key}
		}
		if f.emptyPrepare[key] {
			return []any{}, nil
		}
		return []any{f.item(key)}, nil
	case "callHierarchy/outgoingCalls":
		calls := []any{}
		for _, call := range f.calls[params.Item.Data] {
			calls = append(calls, map[string]any{"to": f.item(call.key), "fromRanges": []any{lineRange(call.line, call.line)}})
		}
		return calls, nil
	case "callHierarchy/incomingCalls":
		calls := []any{}
		for _, call := range f.callers[params.Item.Data] {
			calls = append(calls, map[string]any{"from": f.item(call.key), "fromRanges": []any{lineRange(call.line, call.line)}})
		}
		return calls, nil
	case "textDocument/implementation":
		key, _ := f.keyAt(f.relative(params.TextDocument.URI), params.Position.Line)
		f.lookedUp(key)
		locations := []any{}
		for _, target := range f.implementations[key] {
			path, symbol := f.symbolOf(target)
			locations = append(locations, f.location(path, symbol.start))
		}
		return locations, nil
	case "textDocument/references":
		key, _ := f.keyAt(f.relative(params.TextDocument.URI), params.Position.Line)
		locations := []any{}
		for _, reference := range f.references[key] {
			locations = append(locations, f.location(reference.path, reference.line))
		}
		return locations, nil
	}
	return nil, nil
}

func (f *fakeLanguageServer) documentSymbols(symbols []fakeSymbol) []any {
	result := []any{}
	for _, symbol := range symbols {
		result = append(result, map[string]any{
			"name":           symbol.name,
			"kind":           symbol.kind,
			"range":          lineRange(symbol.start, symbol.end),
			"selectionRange": lineRange(symbol.start, symbol.start),
			"children":       f.documentSymbols(symbol.children),
		})
	}
	return result
}

func (f *fakeLanguageServer) keyAt(path string, line int) (string, bool) {
	for _, symbol := range flattenSymbols(f.symbols[path]) {
		if symbol.start == line {
			return path + "#" + symbol.name, true
		}
	}
	return "", false
}

func (f *fakeLanguageServer) symbolOf(key string) (string, fakeSymbol) {
	path, name, _ := strings.Cut(key, "#")
	for _, symbol := range flattenSymbols(f.symbols[path]) {
		if symbol.name == name {
			return path, symbol
		}
	}
	panic("unknown fake symbol " + key)
}

func flattenSymbols(symbols []fakeSymbol) []fakeSymbol {
	var flat []fakeSymbol
	for _, symbol := range symbols {
		flat = append(flat, symbol)
		flat = append(flat, flattenSymbols(symbol.children)...)
	}
	return flat
}

func (f *fakeLanguageServer) item(key string) map[string]any {
	path, symbol := f.symbolOf(key)
	return map[string]any{
		"name":           symbol.name,
		"kind":           symbol.kind,
		"uri":            lsp.FileURI(filepath.Join(f.root, path)),
		"range":          lineRange(symbol.start, symbol.end),
		"selectionRange": lineRange(symbol.start, symbol.start),
		"data":           key,
	}
}

func (f *fakeLanguageServer) location(path string, line int) map[string]any {
	return map[string]any{"uri": lsp.FileURI(filepath.Join(f.root, path)), "range": lineRange(line, line)}
}

func (f *fakeLanguageServer) relative(uri string) string {
	file, err := lsp.PathOf(uri)
	if err != nil {
		return ""
	}
	relative, err := filepath.Rel(f.root, file)
	if err != nil {
		return ""
	}
	return filepath.ToSlash(relative)
}

func lineRange(start, end int) map[string]any {
	return map[string]any{
		"start": map[string]any{"line": start, "character": 0},
		"end":   map[string]any{"line": end, "character": 1},
	}
}

type fakePool struct {
	servers    map[string]*fakeLanguageServer
	mu         sync.Mutex
	failures   map[string]error
	clients    map[string]*lsp.Client
	transports []*lsptest.PipeTransport
	launches   int
}

func newFakePool(t *testing.T, servers map[string]*fakeLanguageServer) *fakePool {
	pool := &fakePool{servers: servers, failures: map[string]error{}, clients: map[string]*lsp.Client{}}
	t.Cleanup(func() {
		pool.mu.Lock()
		defer pool.mu.Unlock()
		for _, transport := range pool.transports {
			transport.Kill()
		}
	})
	return pool
}

func (p *fakePool) fail(serverID string, err error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.failures[serverID] = err
}

func (p *fakePool) Client(ctx context.Context, launch lsp.Launch) (*lsp.Client, error) {
	serverID, _, _ := strings.Cut(launch.Key, "\x00")
	p.mu.Lock()
	defer p.mu.Unlock()
	if err := p.failures[serverID]; err != nil {
		if errors.Is(err, lsp.ErrStarting) {
			<-ctx.Done()
		}
		return nil, err
	}
	if client, found := p.clients[launch.Key]; found {
		return client, nil
	}
	server, found := p.servers[serverID]
	if !found {
		return nil, errors.New("no fake server for " + serverID)
	}
	transport := lsptest.Connect(server.serve)
	p.transports = append(p.transports, transport)
	client, err := lsp.Start(ctx, transport, launch.Root, nil)
	if err != nil {
		return nil, err
	}
	p.launches++
	p.clients[launch.Key] = client
	return client, nil
}

type fakeFlowGit struct {
	mu           sync.Mutex
	current      string
	changes      []domain.LineChanges
	err          error
	contentsErr  error
	contents     map[string]string
	changedGate  chan struct{}
	changedHolds map[int]chan struct{}
	contentsGate chan struct{}
	changedCalls int
}

func (g *fakeFlowGit) CurrentBranch(context.Context) (string, error) {
	return g.current, nil
}

func (g *fakeFlowGit) ChangedLines(ctx context.Context, _ domain.Comparison) ([]domain.LineChanges, error) {
	g.mu.Lock()
	g.changedCalls++
	gate := g.changedGate
	hold := g.changedHolds[g.changedCalls]
	g.mu.Unlock()
	if hold != nil {
		<-hold
	} else if err := pass(ctx, gate); err != nil {
		return nil, err
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.changes, g.err
}

func (g *fakeFlowGit) changedLinesCalls() int {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.changedCalls
}

func pass(ctx context.Context, gate chan struct{}) error {
	if gate == nil {
		return nil
	}
	select {
	case <-gate:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (g *fakeFlowGit) ContentsOf(ctx context.Context, _ domain.Comparison, side domain.FileSide, paths []string, _ int64) (map[string]domain.Blob, error) {
	if err := pass(ctx, g.contentsGate); err != nil {
		return nil, err
	}
	if g.contentsErr != nil {
		return nil, g.contentsErr
	}
	blobs := map[string]domain.Blob{}
	for _, file := range paths {
		if content, found := g.contents[string(side)+":"+file]; found {
			blobs[file] = domain.Blob(content)
		}
	}
	return blobs, nil
}

func (g *fakeFlowGit) TrackedPaths(context.Context, domain.Comparison) ([]string, error) {
	g.mu.Lock()
	defer g.mu.Unlock()
	untracked := map[string]bool{}
	for _, change := range g.changes {
		if change.Status == domain.ChangeUntracked {
			untracked[change.Path] = true
		}
	}
	var paths []string
	for key := range g.contents {
		if file, isNew := strings.CutPrefix(key, string(domain.FileSideNew)+":"); isNew && !untracked[file] {
			paths = append(paths, file)
		}
	}
	slices.Sort(paths)
	return paths, nil
}

type fakeInstalls struct {
	mu       sync.Mutex
	versions map[string]string
	failures map[string]error
}

func (i *fakeInstalls) Find(id string) (langserver.Installation, bool, error) {
	i.mu.Lock()
	defer i.mu.Unlock()
	if err := i.failures[id]; err != nil {
		return langserver.Installation{}, false, err
	}
	version, found := i.versions[id]
	return langserver.Installation{ID: id, Version: version}, found, nil
}

func (i *fakeInstalls) set(id, version string) {
	i.mu.Lock()
	defer i.mu.Unlock()
	i.versions[id] = version
}

func (i *fakeInstalls) fail(id string, err error) {
	i.mu.Lock()
	defer i.mu.Unlock()
	if i.failures == nil {
		i.failures = map[string]error{}
	}
	i.failures[id] = err
}

type unusedLauncher struct{}

func (unusedLauncher) Start(context.Context, langserver.Installation, catalog.Run, string) (*langserver.Process, map[string]any, error) {
	return nil, nil, errors.New("the fake pool never launches processes")
}

type fakeProjectFiles struct {
	root string
}

func (p fakeProjectFiles) Path(relative string) string {
	return filepath.Join(p.root, filepath.FromSlash(relative))
}

func (p fakeProjectFiles) RootOf(string, []string) string {
	return p.root
}

func (p fakeProjectFiles) Relative(file string) (string, bool) {
	relative, err := filepath.Rel(p.root, file)
	if err != nil || !filepath.IsLocal(relative) {
		return "", false
	}
	return filepath.ToSlash(relative), true
}
