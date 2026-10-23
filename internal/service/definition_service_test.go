package service

import (
	"bufio"
	"context"
	"encoding/json/jsontext"
	"encoding/json/v2"
	"errors"
	"fmt"
	"net"
	"path/filepath"
	"reflect"
	"slices"
	"strings"
	"sync"
	"testing"
	"testing/synctest"
	"time"

	"github.com/obsfx/oversee/internal/catalog"
	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/langserver"
	"github.com/obsfx/oversee/internal/lsp"
	"github.com/obsfx/oversee/internal/lsp/lsptest"
)

var definitionCatalog = catalog.Catalog{
	FileTypes: map[string]catalog.FileType{
		"typescript": {Extensions: []string{"ts"}, Server: "tsls"},
		"go":         {Extensions: []string{"go"}, Server: "gopls"},
	},
	Servers: []catalog.Server{
		{ID: "tsls", Version: "1", Run: catalog.Run{Bin: "tsls"}},
		{ID: "gopls", Version: "1", Run: catalog.Run{Bin: "gopls"}},
	},
}

var workingTree = domain.Comparison{Source: domain.UncommittedSource, Target: "main"}

const appSource = "import { serve } from './serve'\n\nfunction main() {\n  serve()\n}\n"

type definitionMessage struct {
	ID     jsontext.Value `json:"id"`
	Method string         `json:"method"`
	Params jsontext.Value `json:"params"`
}

type definitionOpening struct {
	path       string
	languageID string
	text       string
}

type definitionServer struct {
	mu        sync.Mutex
	answer    any
	failure   *lsp.ResponseError
	silent    bool
	progress  []string
	requests  map[string]int
	openings  []definitionOpening
	positions []string
}

func newDefinitionServer() *definitionServer {
	return &definitionServer{requests: map[string]int{}}
}

func (s *definitionServer) configure(change func(server *definitionServer)) {
	s.mu.Lock()
	defer s.mu.Unlock()
	change(s)
}

func (s *definitionServer) count(method string) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.requests[method]
}

func (s *definitionServer) seen() ([]definitionOpening, []string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return slices.Clone(s.openings), slices.Clone(s.positions)
}

func (s *definitionServer) serve(conn net.Conn) {
	reader := bufio.NewReader(conn)
	for {
		body, err := lsptest.ReadFrame(reader)
		if err != nil {
			return
		}
		var message definitionMessage
		if err := json.Unmarshal(body, &message); err != nil {
			return
		}
		for _, reply := range s.handle(message) {
			encoded, err := json.Marshal(reply)
			if err != nil {
				return
			}
			if err := lsptest.WriteFrame(conn, encoded); err != nil {
				return
			}
		}
	}
}

func (s *definitionServer) handle(message definitionMessage) []any {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.requests[message.Method]++
	var params struct {
		TextDocument struct {
			URI        string `json:"uri"`
			LanguageID string `json:"languageId"`
			Text       string `json:"text"`
		} `json:"textDocument"`
		Position struct {
			Line      int `json:"line"`
			Character int `json:"character"`
		} `json:"position"`
	}
	_ = json.Unmarshal(message.Params, &params)
	file, _ := lsp.PathOf(params.TextDocument.URI)
	switch message.Method {
	case "textDocument/didOpen":
		s.openings = append(s.openings, definitionOpening{path: file, languageID: params.TextDocument.LanguageID, text: params.TextDocument.Text})
	case "textDocument/definition":
		s.positions = append(s.positions, fmt.Sprintf("%s:%d:%d", file, params.Position.Line, params.Position.Character))
	}
	if len(message.ID) == 0 {
		return nil
	}
	if message.Method != "textDocument/definition" {
		return []any{map[string]any{"jsonrpc": "2.0", "id": message.ID, "result": nil}}
	}
	if s.silent {
		return nil
	}
	var replies []any
	for _, kind := range s.progress {
		replies = append(replies, map[string]any{"jsonrpc": "2.0", "method": "$/progress", "params": map[string]any{"token": "index", "value": map[string]any{"kind": kind}}})
	}
	if s.failure != nil {
		return append(replies, map[string]any{"jsonrpc": "2.0", "id": message.ID, "error": s.failure})
	}
	return append(replies, map[string]any{"jsonrpc": "2.0", "id": message.ID, "result": s.answer})
}

func locationAt(uri string, line int) map[string]any {
	return map[string]any{
		"uri": uri,
		"range": map[string]any{
			"start": map[string]any{"line": line, "character": 2},
			"end":   map[string]any{"line": line, "character": 8},
		},
	}
}

type definitionPool struct {
	server     *definitionServer
	mu         sync.Mutex
	failure    error
	clients    map[string]*lsp.Client
	transports []*lsptest.PipeTransport
	launches   []lsp.Launch
	stops      []string
	changes    [][]lsp.FileEvent
}

func newDefinitionPool(t *testing.T, server *definitionServer) *definitionPool {
	pool := &definitionPool{server: server, clients: map[string]*lsp.Client{}}
	t.Cleanup(func() {
		pool.mu.Lock()
		defer pool.mu.Unlock()
		for _, transport := range pool.transports {
			transport.Kill()
		}
	})
	return pool
}

func (p *definitionPool) Client(ctx context.Context, launch lsp.Launch) (*lsp.Client, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.launches = append(p.launches, launch)
	if p.failure != nil {
		if errors.Is(p.failure, lsp.ErrStarting) {
			<-ctx.Done()
		}
		return nil, p.failure
	}
	if client, found := p.clients[launch.Key]; found {
		return client, nil
	}
	transport := lsptest.Connect(p.server.serve)
	p.transports = append(p.transports, transport)
	client, err := lsp.Start(ctx, transport, launch.Root, nil)
	if err != nil {
		return nil, err
	}
	p.clients[launch.Key] = client
	return client, nil
}

func (p *definitionPool) FilesChanged(events []lsp.FileEvent) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.changes = append(p.changes, events)
}

func (p *definitionPool) Stop(prefix string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.stops = append(p.stops, prefix)
}

func (p *definitionPool) fail(err error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.failure = err
}

type definitionGit struct {
	current     string
	branchErr   error
	contents    map[string]string
	contentsErr error
	moved       []string
	movedErr    error
	movedCalls  []string
}

func (g *definitionGit) CurrentBranch(context.Context) (string, error) {
	return g.current, g.branchErr
}

func (g *definitionGit) Contents(_ context.Context, _ domain.Comparison, path string, side domain.FileSide) (domain.Blob, error) {
	if g.contentsErr != nil {
		return nil, g.contentsErr
	}
	content, found := g.contents[string(side)+":"+path]
	if !found {
		return nil, nil
	}
	return domain.Blob(content), nil
}

func (g *definitionGit) ChangedPaths(_ context.Context, from, to string) ([]string, error) {
	g.movedCalls = append(g.movedCalls, from+".."+to)
	return g.moved, g.movedErr
}

type definitionProject struct {
	fakeProjectFiles
	files    map[string]string
	failures map[string]error
}

func (p definitionProject) Exists(file string) bool {
	_, found := p.files[file]
	return found
}

func (p definitionProject) Read(file string) domain.Blob {
	content, _ := p.ReadAbsolute(file)
	return content
}

func (p definitionProject) ReadAbsolute(file string) (domain.Blob, error) {
	if err := p.failures[file]; err != nil {
		return nil, err
	}
	content, found := p.files[file]
	if !found {
		return nil, nil
	}
	return domain.Blob(content), nil
}

func (p definitionProject) ReadRelative(relative string) (domain.Blob, error) {
	return p.ReadAbsolute(p.Path(relative))
}

type definitionFixture struct {
	root     string
	external string
	git      *definitionGit
	installs *fakeInstalls
	server   *definitionServer
	pool     *definitionPool
	project  definitionProject
	service  *DefinitionService
}

func newDefinitionFixture(t *testing.T) *definitionFixture {
	base := t.TempDir()
	root := filepath.Join(base, "repo")
	fixture := &definitionFixture{
		root:     root,
		external: filepath.Join(base, "sdk", "lib.d.ts"),
		git:      &definitionGit{current: "main", contents: map[string]string{"new:src/app.ts": appSource}},
		installs: &fakeInstalls{versions: map[string]string{"tsls": "1"}},
		server:   newDefinitionServer(),
		project:  definitionProject{root: root, files: map[string]string{}, failures: map[string]error{}},
	}
	fixture.pool = newDefinitionPool(t, fixture.server)
	fixture.service = NewDefinitionService(definitionCatalog, fixture.git, fixture.installs, unusedLauncher{}, fixture.project, fixture.pool)
	return fixture
}

func (f *definitionFixture) path(relative string) string {
	return filepath.Join(f.root, filepath.FromSlash(relative))
}

func (f *definitionFixture) uri(relative string) string {
	return lsp.FileURI(f.path(relative))
}

func appQuery() domain.DefinitionQuery {
	return domain.DefinitionQuery{Comparison: workingTree, Side: domain.FileSideNew, Path: "src/app.ts", Line: 4, Character: 3}
}

func (f *definitionFixture) find(t *testing.T, query domain.DefinitionQuery) domain.DefinitionLookup {
	t.Helper()
	lookup, err := f.service.Find(t.Context(), query)
	if err != nil {
		t.Fatalf("Find() error = %v", err)
	}
	return lookup
}

func TestDefinitionServiceStatuses(t *testing.T) {
	tests := []struct {
		name            string
		query           func(query *domain.DefinitionQuery)
		age             time.Duration
		setup           func(f *definitionFixture)
		want            domain.DefinitionLookup
		wantDefinitions int
		wantTook        time.Duration
		wantCancels     int
	}{
		{
			name: "a file type without a server",
			query: func(query *domain.DefinitionQuery) {
				query.Path = "docs/notes.md"
			},
			want: domain.DefinitionLookup{Status: domain.ServerUnsupported},
		},
		{
			name: "a server that is not installed",
			query: func(query *domain.DefinitionQuery) {
				query.Path = "cmd/main.go"
			},
			want: domain.DefinitionLookup{Status: domain.ServerNotInstalled, Server: "gopls"},
		},
		{
			name: "a branch that is not checked out",
			query: func(query *domain.DefinitionQuery) {
				query.Comparison = domain.Comparison{Source: "feature", Target: "main"}
			},
			want: domain.DefinitionLookup{Status: domain.ServerNeedsCheckout, Server: "tsls"},
		},
		{
			name: "the checked out branch",
			query: func(query *domain.DefinitionQuery) {
				query.Comparison = domain.Comparison{Source: "main", Target: "develop"}
			},
			setup: func(f *definitionFixture) {
				f.server.configure(func(server *definitionServer) {
					server.answer = []any{locationAt(f.uri("src/serve.ts"), 0)}
				})
			},
			want:            domain.DefinitionLookup{Status: domain.ServerReady, Server: "tsls"},
			wantDefinitions: 1,
		},
		{
			name: "a session that is still starting",
			setup: func(f *definitionFixture) {
				f.pool.fail(lsp.ErrStarting)
			},
			want:     domain.DefinitionLookup{Status: domain.ServerStarting, Server: "tsls"},
			wantTook: 10 * time.Second,
		},
		{
			name: "a session that failed to start",
			setup: func(f *definitionFixture) {
				f.pool.fail(errors.New("spawn tsls: no such file"))
			},
			want: domain.DefinitionLookup{Status: domain.ServerFailed, Server: "tsls", Error: "spawn tsls: no such file"},
		},
		{
			name: "a definition request that fails",
			setup: func(f *definitionFixture) {
				f.server.configure(func(server *definitionServer) {
					server.failure = &lsp.ResponseError{Code: -32603, Message: "no project"}
				})
			},
			want: domain.DefinitionLookup{Status: domain.ServerFailed, Server: "tsls", Error: "language server error -32603: no project"},
		},
		{
			name: "a definition request that times out",
			setup: func(f *definitionFixture) {
				f.server.configure(func(server *definitionServer) {
					server.silent = true
				})
			},
			want:        domain.DefinitionLookup{Status: domain.ServerIndexing, Server: "tsls"},
			wantTook:    10 * time.Second,
			wantCancels: 1,
		},
		{
			name: "an empty answer in the first 20 seconds",
			setup: func(f *definitionFixture) {
				f.server.configure(func(server *definitionServer) {
					server.answer = []any{}
				})
			},
			want: domain.DefinitionLookup{Status: domain.ServerIndexing, Server: "tsls"},
		},
		{
			name: "an empty answer after 20 seconds",
			age:  20 * time.Second,
			setup: func(f *definitionFixture) {
				f.server.configure(func(server *definitionServer) {
					server.answer = []any{}
				})
			},
			want: domain.DefinitionLookup{Status: domain.ServerReady, Server: "tsls"},
		},
		{
			name: "a null answer while the server reports progress",
			age:  20 * time.Second,
			setup: func(f *definitionFixture) {
				f.server.configure(func(server *definitionServer) {
					server.progress = []string{"begin"}
				})
			},
			want: domain.DefinitionLookup{Status: domain.ServerIndexing, Server: "tsls"},
		},
		{
			name: "a null answer after the progress ended",
			age:  20 * time.Second,
			setup: func(f *definitionFixture) {
				f.server.configure(func(server *definitionServer) {
					server.progress = []string{"begin", "end"}
				})
			},
			want: domain.DefinitionLookup{Status: domain.ServerReady, Server: "tsls"},
		},
		{
			name: "an answer while the server reports progress",
			age:  20 * time.Second,
			setup: func(f *definitionFixture) {
				f.server.configure(func(server *definitionServer) {
					server.progress = []string{"begin"}
					server.answer = []any{locationAt(f.uri("src/serve.ts"), 0)}
				})
			},
			want:            domain.DefinitionLookup{Status: domain.ServerReady, Server: "tsls"},
			wantDefinitions: 1,
		},
		{
			name: "an answer in the first 20 seconds",
			setup: func(f *definitionFixture) {
				f.server.configure(func(server *definitionServer) {
					server.answer = []any{locationAt(f.uri("src/serve.ts"), 0), locationAt(f.uri("src/app.ts"), 0)}
				})
			},
			want:            domain.DefinitionLookup{Status: domain.ServerReady, Server: "tsls"},
			wantDefinitions: 2,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			synctest.Test(t, func(t *testing.T) {
				fixture := newDefinitionFixture(t)
				query := appQuery()
				if test.query != nil {
					test.query(&query)
				}
				if test.age > 0 {
					fixture.find(t, query)
					time.Sleep(test.age)
				}
				if test.setup != nil {
					test.setup(fixture)
				}
				began := time.Now()
				lookup := fixture.find(t, query)
				if took := time.Since(began); took != test.wantTook {
					t.Errorf("Find() took %s, want %s", took, test.wantTook)
				}
				definitions := len(lookup.Definitions)
				lookup.Definitions = nil
				if !reflect.DeepEqual(lookup, test.want) || definitions != test.wantDefinitions {
					t.Fatalf("Find() = %+v with %d definitions, want %+v with %d", lookup, definitions, test.want, test.wantDefinitions)
				}
				synctest.Wait()
				if cancels := fixture.server.count("$/cancelRequest"); cancels != test.wantCancels {
					t.Fatalf("$/cancelRequest sent %d times, want %d", cancels, test.wantCancels)
				}
			})
		})
	}
}

func TestDefinitionServiceMapsLocationsToDefinitions(t *testing.T) {
	fixture := newDefinitionFixture(t)
	fixture.git.contents["old:src/app.ts"] = "o1\no2\no3\no4"
	fixture.project.files[fixture.path("src/app.ts")] = "disk1\ndisk2\ndisk3\ndisk4"
	fixture.project.files[fixture.path("src/serve.ts")] = "export function serve() {}\n"
	fixture.project.files[fixture.external] = "declare function lib(): void\n"
	fixture.server.configure(func(server *definitionServer) {
		server.answer = []any{
			locationAt(fixture.uri("src/app.ts"), 1),
			locationAt(fixture.uri("src/serve.ts"), 0),
			locationAt(fixture.uri("src/app.ts"), 1),
			locationAt(fixture.uri("src/gone.ts"), 4),
			locationAt(lsp.FileURI(fixture.external), 0),
			locationAt("untitled:Untitled-1", 0),
			locationAt("https://example.com/lib.ts", 0),
		}
	})
	query := domain.DefinitionQuery{Comparison: workingTree, Side: domain.FileSideOld, Path: "src/app.ts", Line: 3, Character: 2}
	lookup := fixture.find(t, query)
	want := domain.DefinitionLookup{
		Status: domain.ServerReady,
		Server: "tsls",
		Definitions: []domain.Definition{
			{Path: "src/app.ts", Side: domain.FileSideOld, Line: 2, Snippet: domain.Snippet{StartLine: 2, Lines: []string{"o2", "o3", "o4"}}},
			{Path: "src/serve.ts", Side: domain.FileSideNew, Line: 1, Snippet: domain.Snippet{StartLine: 1, Lines: []string{"export function serve() {}", ""}}},
			{Path: "src/gone.ts", Side: domain.FileSideNew, Line: 5, Snippet: domain.Snippet{StartLine: 5}},
			{Path: fixture.external, External: true, Side: domain.FileSideNew, Line: 1, Snippet: domain.Snippet{StartLine: 1, Lines: []string{"declare function lib(): void", ""}}},
		},
	}
	if !reflect.DeepEqual(lookup, want) {
		t.Fatalf("Find() =\n%+v\nwant\n%+v", lookup, want)
	}
	openings, positions := fixture.server.seen()
	wantOpenings := []definitionOpening{{path: fixture.path("src/app.ts"), languageID: "typescript", text: "o1\no2\no3\no4"}}
	if !slices.Equal(openings, wantOpenings) {
		t.Errorf("opened %+v, want the old side of the queried file %+v", openings, wantOpenings)
	}
	if want := []string{fixture.path("src/app.ts") + ":2:2"}; !slices.Equal(positions, want) {
		t.Errorf("definition positions = %q, want %q", positions, want)
	}
	if len(fixture.pool.launches) != 1 {
		t.Fatalf("launches = %d, want 1", len(fixture.pool.launches))
	}
	launch := fixture.pool.launches[0]
	if launch.Root != fixture.root || !strings.HasPrefix(launch.Key, sessionKeyPrefix("tsls")) || !strings.Contains(launch.Key, fixture.root) {
		t.Errorf("launch key %q root %q, want the tsls stop prefix and the root %q", launch.Key, launch.Root, fixture.root)
	}
	content, err := fixture.service.FileContent(domain.FileContentRequest{Path: fixture.external, External: true})
	if err != nil || string(content.Contents) != "declare function lib(): void\n" {
		t.Fatalf("FileContent(returned external) = %q, %v, want its content", content.Contents, err)
	}
}

type recordingLauncher struct {
	installation langserver.Installation
	run          catalog.Run
	root         string
}

var errSpawnFailed = errors.New("spawn failed")

func (l *recordingLauncher) Start(_ context.Context, installation langserver.Installation, run catalog.Run, root string) (*langserver.Process, map[string]any, error) {
	l.installation, l.run, l.root = installation, run, root
	return nil, nil, errSpawnFailed
}

func TestServerLaunchStartsTheInstalledServerAtTheRoot(t *testing.T) {
	launcher := &recordingLauncher{}
	server := catalog.Server{ID: "tsls", Run: catalog.Run{Bin: "tsls", Args: []string{"--stdio"}}}
	installation := langserver.Installation{ID: "tsls", Version: "4.3.3"}
	launch := serverLaunch(launcher, server, installation, "/repo/web")
	transport, options, err := launch.Start(t.Context())
	if !errors.Is(err, errSpawnFailed) || transport != nil || options != nil {
		t.Fatalf("Start() = %v, %v, %v, want only the launcher error", transport, options, err)
	}
	if launcher.installation != installation || !reflect.DeepEqual(launcher.run, server.Run) || launcher.root != "/repo/web" {
		t.Fatalf("launcher got %+v %+v %q, want the installation, the run and the root", launcher.installation, launcher.run, launcher.root)
	}
	if launch.Root != "/repo/web" || !strings.HasPrefix(launch.Key, sessionKeyPrefix("tsls")) {
		t.Fatalf("launch key %q root %q, want the tsls stop prefix and /repo/web", launch.Key, launch.Root)
	}
	other := serverLaunch(launcher, server, langserver.Installation{ID: "tsls", Version: "4.4.0"}, "/repo/web")
	elsewhere := serverLaunch(launcher, server, installation, "/repo/api")
	if other.Key == launch.Key || elsewhere.Key == launch.Key {
		t.Fatalf("keys %q, %q and %q must differ by version and root", launch.Key, other.Key, elsewhere.Key)
	}
}

func TestDefinitionServiceRejectsLookupsItCanNotRun(t *testing.T) {
	errInstalls := errors.New("read installs")
	errBranch := errors.New("rev-parse HEAD")
	errContents := errors.New("cat-file")
	tests := []struct {
		name    string
		query   func(query *domain.DefinitionQuery)
		setup   func(f *definitionFixture)
		wantErr func(error) bool
	}{
		{
			name: "a line before the first",
			query: func(query *domain.DefinitionQuery) {
				query.Line = 0
			},
			wantErr: isValidationError,
		},
		{
			name: "a path outside the repository",
			query: func(query *domain.DefinitionQuery) {
				query.Path = "../secrets.ts"
			},
			wantErr: isValidationError,
		},
		{
			name: "an installation lookup that fails",
			setup: func(f *definitionFixture) {
				f.installs.fail("tsls", errInstalls)
			},
			wantErr: func(err error) bool {
				return errors.Is(err, errInstalls)
			},
		},
		{
			name: "a current branch that can not be read",
			query: func(query *domain.DefinitionQuery) {
				query.Comparison = domain.Comparison{Source: "main", Target: "develop"}
			},
			setup: func(f *definitionFixture) {
				f.git.branchErr = errBranch
			},
			wantErr: func(err error) bool {
				return errors.Is(err, errBranch)
			},
		},
		{
			name: "contents that can not be read",
			setup: func(f *definitionFixture) {
				f.git.contentsErr = errContents
			},
			wantErr: func(err error) bool {
				return errors.Is(err, errContents)
			},
		},
		{
			name: "a file missing on the queried side",
			query: func(query *domain.DefinitionQuery) {
				query.Side = domain.FileSideOld
			},
			wantErr: func(err error) bool {
				return errors.Is(err, domain.ErrNotFound)
			},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			fixture := newDefinitionFixture(t)
			if test.setup != nil {
				test.setup(fixture)
			}
			query := appQuery()
			if test.query != nil {
				test.query(&query)
			}
			lookup, err := fixture.service.Find(t.Context(), query)
			if !test.wantErr(err) {
				t.Fatalf("Find() = %+v, %v, not the expected error", lookup, err)
			}
			if len(fixture.pool.launches) != 0 {
				t.Fatalf("Find() asked for %d sessions, want none", len(fixture.pool.launches))
			}
		})
	}
}

func TestDefinitionServiceFileContent(t *testing.T) {
	errDisk := errors.New("permission denied")
	tests := []struct {
		name    string
		request func(f *definitionFixture) domain.FileContentRequest
		want    string
		wantErr func(error) bool
	}{
		{
			name: "a repository file",
			request: func(*definitionFixture) domain.FileContentRequest {
				return domain.FileContentRequest{Path: "src/serve.ts"}
			},
			want: "export function serve() {}\n",
		},
		{
			name: "a missing repository file",
			request: func(*definitionFixture) domain.FileContentRequest {
				return domain.FileContentRequest{Path: "src/gone.ts"}
			},
			wantErr: func(err error) bool {
				return errors.Is(err, domain.ErrNotFound)
			},
		},
		{
			name: "a binary file",
			request: func(*definitionFixture) domain.FileContentRequest {
				return domain.FileContentRequest{Path: "assets/logo.png"}
			},
			wantErr: func(err error) bool {
				validation, ok := errors.AsType[domain.ValidationError](err)
				return ok && validation.Field == "path" && validation.Reason == "is a binary file"
			},
		},
		{
			name: "a file over the read limit",
			request: func(*definitionFixture) domain.FileContentRequest {
				return domain.FileContentRequest{Path: "dist/bundle.js"}
			},
			wantErr: func(err error) bool {
				validation, ok := errors.AsType[domain.ValidationError](err)
				return ok && validation.Field == "path" && validation.Reason == "is larger than 8 MiB"
			},
		},
		{
			name: "a file that can not be read",
			request: func(*definitionFixture) domain.FileContentRequest {
				return domain.FileContentRequest{Path: "src/locked.ts"}
			},
			wantErr: func(err error) bool {
				return errors.Is(err, errDisk)
			},
		},
		{
			name: "a path outside the repository",
			request: func(*definitionFixture) domain.FileContentRequest {
				return domain.FileContentRequest{Path: "../outside.ts"}
			},
			wantErr: isValidationError,
		},
		{
			name: "an external path no lookup returned",
			request: func(f *definitionFixture) domain.FileContentRequest {
				return domain.FileContentRequest{Path: f.external, External: true}
			},
			wantErr: func(err error) bool {
				return errors.Is(err, domain.ErrNotFound)
			},
		},
		{
			name: "a relative external path",
			request: func(*definitionFixture) domain.FileContentRequest {
				return domain.FileContentRequest{Path: "sdk/lib.d.ts", External: true}
			},
			wantErr: isValidationError,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			fixture := newDefinitionFixture(t)
			fixture.project.files[fixture.path("src/serve.ts")] = "export function serve() {}\n"
			fixture.project.files[fixture.path("assets/logo.png")] = "\x89PNG\x00\x00"
			fixture.project.failures[fixture.path("dist/bundle.js")] = langserver.FileTooLargeError{LimitMiB: 8}
			fixture.project.failures[fixture.path("src/locked.ts")] = errDisk
			fixture.project.files[fixture.external] = "declare function lib(): void\n"
			request := test.request(fixture)
			content, err := fixture.service.FileContent(request)
			if test.wantErr != nil {
				if !test.wantErr(err) {
					t.Fatalf("FileContent() = %q, %v, not the expected error", content.Contents, err)
				}
				return
			}
			if err != nil || content.Path != request.Path || string(content.Contents) != test.want {
				t.Fatalf("FileContent() = %+v, %v, want %q", content, err, test.want)
			}
		})
	}
}

func TestExternalPathsKeepTheLast512(t *testing.T) {
	var paths externalPaths
	pathOf := func(index int) string {
		return fmt.Sprintf("/sdk/file-%d.d.ts", index)
	}
	for index := range 512 {
		paths.add(pathOf(index))
	}
	for index := range 512 {
		if !paths.has(pathOf(index)) {
			t.Fatalf("path %d of 512 is forgotten", index)
		}
	}
	paths.add(pathOf(0))
	paths.add(pathOf(512))
	if paths.has(pathOf(0)) {
		t.Fatalf("the oldest path is still known after the 513th")
	}
	for index := 1; index <= 512; index++ {
		if !paths.has(pathOf(index)) {
			t.Fatalf("path %d is forgotten, want only the oldest gone", index)
		}
	}
	if paths.has("/sdk/unknown.d.ts") {
		t.Fatalf("a path that was never added is known")
	}
}

func TestDefinitionServiceForwardsWorkspaceChanges(t *testing.T) {
	tests := []struct {
		name       string
		change     domain.WorkspaceChange
		moved      []string
		movedErr   error
		wantDiffs  []string
		wantEvents []string
		wantStops  []string
	}{
		{
			name:       "edited files under the same head",
			change:     domain.WorkspaceChange{Paths: []string{"src/serve.ts", "src/old.ts", "src/app.ts"}, FromHead: "a1", ToHead: "a1"},
			wantEvents: []string{"changed src/app.ts", "deleted src/old.ts", "changed src/serve.ts"},
		},
		{
			name:       "the first look at the workspace",
			change:     domain.WorkspaceChange{Paths: []string{"src/app.ts"}, ToHead: "a1"},
			wantEvents: []string{"changed src/app.ts"},
		},
		{
			name:       "a moved head",
			change:     domain.WorkspaceChange{Paths: []string{"src/app.ts"}, RefsChanged: true, FromHead: "a1", ToHead: "b2"},
			moved:      []string{"src/serve.ts", "src/app.ts", "src/old.ts"},
			wantDiffs:  []string{"a1..b2"},
			wantEvents: []string{"changed src/app.ts", "deleted src/old.ts", "changed src/serve.ts"},
		},
		{
			name:      "a moved head whose diff fails",
			change:    domain.WorkspaceChange{Paths: []string{"src/app.ts"}, RefsChanged: true, FromHead: "a1", ToHead: "b2"},
			movedErr:  errors.New("bad object b2"),
			wantDiffs: []string{"a1..b2"},
			wantStops: []string{""},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			fixture := newDefinitionFixture(t)
			fixture.project.files[fixture.path("src/app.ts")] = appSource
			fixture.project.files[fixture.path("src/serve.ts")] = "export function serve() {}\n"
			fixture.git.moved, fixture.git.movedErr = test.moved, test.movedErr
			fixture.service.WorkspaceChanged(t.Context(), test.change)
			if !slices.Equal(fixture.git.movedCalls, test.wantDiffs) {
				t.Errorf("head diffs = %q, want %q", fixture.git.movedCalls, test.wantDiffs)
			}
			if !slices.Equal(fixture.pool.stops, test.wantStops) {
				t.Errorf("stops = %q, want %q", fixture.pool.stops, test.wantStops)
			}
			if test.wantEvents == nil {
				if len(fixture.pool.changes) != 0 {
					t.Fatalf("forwarded %+v, want nothing", fixture.pool.changes)
				}
				return
			}
			var want []lsp.FileEvent
			for _, event := range test.wantEvents {
				kind, relative, _ := strings.Cut(event, " ")
				want = append(want, lsp.FileEventOf(fixture.path(relative), kind == "changed"))
			}
			if len(fixture.pool.changes) != 1 || !slices.Equal(fixture.pool.changes[0], want) {
				t.Fatalf("forwarded %+v, want one call with %+v", fixture.pool.changes, want)
			}
		})
	}
}
