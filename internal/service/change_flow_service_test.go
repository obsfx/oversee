package service

import (
	"errors"
	"fmt"
	"slices"
	"sync"
	"testing"
	"time"

	"github.com/obsfx/oversee/internal/catalog"
	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/gdscript"
	"github.com/obsfx/oversee/internal/lsp"
)

var flowCatalog = catalog.Catalog{
	FileTypes: map[string]catalog.FileType{
		"typescript":      {Extensions: []string{"ts"}, Server: "tsls"},
		"typescriptreact": {Extensions: []string{"tsx"}, Server: "tsls"},
		"go":              {Extensions: []string{"go"}, Server: "gopls"},
	},
	Servers: []catalog.Server{
		{ID: "tsls", Run: catalog.Run{Bin: "tsls"}},
		{ID: "gopls", Run: catalog.Run{Bin: "gopls"}},
	},
}

var uncommitted = domain.Comparison{Source: domain.UncommittedSource, Target: "main"}

type flowFixture struct {
	git      *fakeFlowGit
	installs *fakeInstalls
	tsls     *fakeLanguageServer
	gopls    *fakeLanguageServer
	pool     *fakePool
	flows    *ChangeFlowService
}

func newFlowFixture(t *testing.T) *flowFixture {
	root := t.TempDir()
	tsls := newFakeLanguageServer(root)
	gopls := newFakeLanguageServer(root)
	pool := newFakePool(t, map[string]*fakeLanguageServer{"tsls": tsls, "gopls": gopls})
	git := &fakeFlowGit{current: "main", contents: map[string]string{}}
	installs := &fakeInstalls{versions: map[string]string{"tsls": "1"}}
	flows := NewChangeFlowService(flowCatalog, git, installs, unusedLauncher{}, fakeProjectFiles{root: root}, pool, gdscript.NewAnalyzer())
	t.Cleanup(flows.Close)
	return &flowFixture{git: git, installs: installs, tsls: tsls, gopls: gopls, pool: pool, flows: flows}
}

func (f *flowFixture) change(changes ...domain.LineChanges) {
	f.git.changes = append(f.git.changes, changes...)
	for _, change := range changes {
		if change.HasSide(domain.FileSideNew) {
			f.git.contents["new:"+change.Path] = "new " + change.Path
		}
	}
}

func (f *flowFixture) callChain() {
	f.tsls.symbols["a.ts"] = []fakeSymbol{
		{name: "entry", kind: symbolKindFunction, start: 0, end: 4},
		{name: "helper", kind: symbolKindFunction, start: 6, end: 8},
		{name: "untouched", kind: symbolKindFunction, start: 10, end: 12},
	}
	f.tsls.symbols["b.ts"] = []fakeSymbol{{name: "util", kind: symbolKindFunction, start: 0, end: 2}}
	f.tsls.symbols["c.ts"] = []fakeSymbol{{name: "main", kind: symbolKindFunction, start: 0, end: 30}}
	f.tsls.calls["a.ts#entry"] = []fakeCall{{key: "a.ts#untouched", line: 1}, {key: "a.ts#helper", line: 2}, {key: "b.ts#util", line: 3}}
	f.tsls.calls["a.ts#helper"] = []fakeCall{{key: "b.ts#util", line: 7}}
	f.tsls.callers["a.ts#entry"] = []fakeCall{{key: "c.ts#main", line: 20}}
	f.change(
		domain.LineChanges{Path: "a.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{{OldStart: 2, OldLines: 7, NewStart: 2, NewLines: 7}}},
		domain.WholeFileAdded("b.ts"),
	)
}

func (f *flowFixture) flow(t *testing.T, comparison domain.Comparison) domain.FlowGraph {
	t.Helper()
	graph, err := f.flows.Flow(t.Context(), comparison)
	if err != nil {
		t.Fatalf("Flow: %v", err)
	}
	return graph
}

func nodesOf(graph domain.FlowGraph) []string {
	nodes := make([]string, 0, len(graph.Nodes))
	for _, node := range graph.Nodes {
		nodes = append(nodes, fmt.Sprintf("%s %s %s %s %d-%d", node.ID, node.Name, node.Kind, node.Change, node.Line, node.EndLine))
	}
	return nodes
}

func edgesOf(graph domain.FlowGraph) []string {
	edges := make([]string, 0, len(graph.Edges))
	for _, edge := range graph.Edges {
		edges = append(edges, fmt.Sprintf("%s -> %s :%d %s", edge.From, edge.To, edge.Line, edge.Via))
	}
	return edges
}

func expectStrings(t *testing.T, label string, got, want []string) {
	t.Helper()
	if !slices.Equal(got, want) {
		t.Fatalf("%s\n got: %q\nwant: %q", label, got, want)
	}
}

func expectServers(t *testing.T, graph domain.FlowGraph, want ...domain.FlowServer) {
	t.Helper()
	if !slices.Equal(graph.Servers, want) {
		t.Fatalf("servers\n got: %+v\nwant: %+v", graph.Servers, want)
	}
}

func TestChangeFlowConnectsChangedFunctions(t *testing.T) {
	fixture := newFlowFixture(t)
	fixture.callChain()

	graph := fixture.flow(t, uncommitted)

	expectServers(t, graph, domain.FlowServer{Server: "tsls", Status: domain.ServerReady})
	expectStrings(t, "nodes", nodesOf(graph), []string{
		"a.ts#1 entry function modified 1-5",
		"a.ts#7 helper function modified 7-9",
		"b.ts#1 util function added 1-3",
	})
	expectStrings(t, "edges", edgesOf(graph), []string{
		"a.ts#1 -> a.ts#7 :3 call",
		"a.ts#1 -> b.ts#1 :4 call",
		"a.ts#7 -> b.ts#1 :8 call",
	})
	want := map[string][]domain.FlowOrigin{"a.ts#1": {{Name: "main", Path: "c.ts", Line: 21}}}
	if fmt.Sprint(graph.Origins) != fmt.Sprint(want) {
		t.Fatalf("origins = %+v, want %+v", graph.Origins, want)
	}
}

func TestChangeFlowBridgesInterfaceCallsToImplementations(t *testing.T) {
	fixture := newFlowFixture(t)
	fixture.tsls.symbols["a.ts"] = []fakeSymbol{{name: "entry", kind: symbolKindFunction, start: 0, end: 4}}
	fixture.tsls.symbols["store.ts"] = []fakeSymbol{{name: "Store", kind: symbolKindInterface, start: 0, end: 5, children: []fakeSymbol{
		{name: "save", kind: symbolKindMethod, start: 1, end: 1},
	}}}
	fixture.tsls.symbols["file-store.ts"] = []fakeSymbol{{name: "FileStore", kind: symbolKindClass, start: 0, end: 9, children: []fakeSymbol{
		{name: "save", kind: symbolKindMethod, start: 2, end: 6},
	}}}
	fixture.tsls.calls["a.ts#entry"] = []fakeCall{{key: "store.ts#save", line: 2}}
	fixture.tsls.implementations["store.ts#save"] = []string{"file-store.ts#save"}
	fixture.git.contents["new:store.ts"] = "new store.ts"
	fixture.change(
		domain.LineChanges{Path: "a.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{{OldStart: 3, OldLines: 1, NewStart: 3, NewLines: 1}}},
		domain.LineChanges{Path: "file-store.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{{OldStart: 4, OldLines: 2, NewStart: 4, NewLines: 2}}},
	)

	graph := fixture.flow(t, uncommitted)

	expectStrings(t, "nodes", nodesOf(graph), []string{
		"a.ts#1 entry function modified 1-5",
		"file-store.ts#3 FileStore.save method modified 3-7",
	})
	expectStrings(t, "edges", edgesOf(graph), []string{"a.ts#1 -> file-store.ts#3 :3 implementation"})
}

func TestChangeFlowOriginsFallBackToReferences(t *testing.T) {
	fixture := newFlowFixture(t)
	fixture.tsls.symbols["a.ts"] = []fakeSymbol{{name: "entry", kind: symbolKindFunction, start: 0, end: 4}}
	fixture.tsls.references["a.ts#entry"] = []fakeReference{{path: "routes/c.ts", line: 4}}
	fixture.change(domain.LineChanges{Path: "a.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{{OldStart: 2, OldLines: 1, NewStart: 2, NewLines: 1}}})

	graph := fixture.flow(t, uncommitted)

	want := map[string][]domain.FlowOrigin{"a.ts#1": {{Name: "c.ts", Path: "routes/c.ts", Line: 5}}}
	if fmt.Sprint(graph.Origins) != fmt.Sprint(want) {
		t.Fatalf("origins = %+v, want %+v", graph.Origins, want)
	}
}

func TestChangeFlowListsRemovedFunctions(t *testing.T) {
	fixture := newFlowFixture(t)
	fixture.tsls.symbols["a.ts"] = []fakeSymbol{{name: "entry", kind: symbolKindFunction, start: 0, end: 4}}
	fixture.tsls.symbols[".oversee-previous.a.ts"] = []fakeSymbol{
		{name: "entry", kind: symbolKindFunction, start: 0, end: 4},
		{name: "legacy", kind: symbolKindFunction, start: 9, end: 11},
	}
	fixture.tsls.symbols["src/.oversee-previous.gone.ts"] = []fakeSymbol{{name: "obsolete", kind: symbolKindFunction, start: 0, end: 3}}
	fixture.change(
		domain.LineChanges{Path: "a.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{
			{OldStart: 2, OldLines: 1, NewStart: 2, NewLines: 1},
			{OldStart: 10, OldLines: 3, NewStart: 9, NewLines: 0},
		}},
		domain.LineChanges{Path: "src/gone.ts", Status: domain.ChangeDeleted, Hunks: []domain.LineHunk{{OldStart: 1, OldLines: 4}}},
	)
	fixture.git.contents["old:a.ts"] = "old a.ts"
	fixture.git.contents["old:src/gone.ts"] = "old gone.ts"

	graph := fixture.flow(t, uncommitted)

	expectStrings(t, "nodes", nodesOf(graph), []string{
		"a.ts#1 entry function modified 1-5",
		"a.ts#removed-10 legacy function removed 10-12",
		"src/gone.ts#removed-1 obsolete function removed 1-4",
	})
	expectStrings(t, "edges", edgesOf(graph), []string{})
	expectStrings(t, "opened documents", fixture.tsls.openedDocuments(), []string{"a.ts", ".oversee-previous.a.ts", "src/.oversee-previous.gone.ts"})
}

func TestChangeFlowServerStatuses(t *testing.T) {
	cases := []struct {
		name       string
		comparison domain.Comparison
		prepare    func(fixture *flowFixture)
		servers    []domain.FlowServer
		nodes      []string
		edges      []string
	}{
		{
			name:       "server not installed",
			comparison: uncommitted,
			prepare: func(fixture *flowFixture) {
				fixture.installs.versions = map[string]string{}
			},
			servers: []domain.FlowServer{{Server: "tsls", Status: domain.ServerNotInstalled}},
		},
		{
			name:       "comparison not on the working tree",
			comparison: domain.Comparison{Source: "feature", Target: "main"},
			servers:    []domain.FlowServer{{Server: "tsls", Status: domain.ServerNeedsCheckout}},
		},
		{
			name:       "session still starting",
			comparison: uncommitted,
			prepare: func(fixture *flowFixture) {
				fixture.flows.startWait = 20 * time.Millisecond
				fixture.pool.fail("tsls", lsp.ErrStarting)
			},
			servers: []domain.FlowServer{{Server: "tsls", Status: domain.ServerStarting}},
		},
		{
			name:       "session failed",
			comparison: uncommitted,
			prepare: func(fixture *flowFixture) {
				fixture.pool.fail("tsls", errors.New("tsls crashed"))
			},
			servers: []domain.FlowServer{{Server: "tsls", Status: domain.ServerFailed, Error: "tsls crashed"}},
		},
		{
			name:       "server without document symbols",
			comparison: uncommitted,
			prepare: func(fixture *flowFixture) {
				fixture.tsls.capabilities.symbols = false
			},
			servers: []domain.FlowServer{{Server: "tsls", Status: domain.ServerUnsupported}},
		},
		{
			name:       "server without call hierarchy lists functions without calls",
			comparison: uncommitted,
			prepare: func(fixture *flowFixture) {
				fixture.tsls.capabilities.callHierarchy = false
			},
			servers: []domain.FlowServer{{Server: "tsls", Status: domain.ServerUnsupported}},
			nodes: []string{
				"a.ts#1 entry function modified 1-5",
				"a.ts#7 helper function modified 7-9",
				"b.ts#1 util function added 1-3",
			},
		},
	}
	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			fixture := newFlowFixture(t)
			fixture.callChain()
			if testCase.prepare != nil {
				testCase.prepare(fixture)
			}

			graph := fixture.flow(t, testCase.comparison)

			expectServers(t, graph, testCase.servers...)
			expectStrings(t, "nodes", nodesOf(graph), append([]string{}, testCase.nodes...))
			expectStrings(t, "edges", edgesOf(graph), append([]string{}, testCase.edges...))
		})
	}
}

func TestChangeFlowRejectsInvalidAndGoneComparisons(t *testing.T) {
	fixture := newFlowFixture(t)
	if _, err := fixture.flows.Flow(t.Context(), domain.Comparison{Target: "main"}); !isValidationError(err) {
		t.Fatalf("empty source error = %v, want a validation error", err)
	}
	fixture.git.err = fmt.Errorf("rev-parse: %w", domain.ErrUnknownBranch)
	if _, err := fixture.flows.Flow(t.Context(), uncommitted); !errors.Is(err, domain.ErrUnknownBranch) {
		t.Fatalf("gone ref error = %v, want ErrUnknownBranch", err)
	}
}

func isValidationError(err error) bool {
	_, matched := errors.AsType[domain.ValidationError](err)
	return matched
}

func TestChangeFlowKeepsResultsOfReadyServers(t *testing.T) {
	fixture := newFlowFixture(t)
	fixture.callChain()
	fixture.change(domain.LineChanges{Path: "cmd/main.go", Status: domain.ChangeModified, Hunks: []domain.LineHunk{{OldStart: 1, OldLines: 1, NewStart: 1, NewLines: 1}}})

	graph := fixture.flow(t, uncommitted)

	expectServers(t, graph,
		domain.FlowServer{Server: "gopls", Status: domain.ServerNotInstalled},
		domain.FlowServer{Server: "tsls", Status: domain.ServerReady},
	)
	if len(graph.Nodes) != 3 || len(graph.Edges) != 3 {
		t.Fatalf("nodes %d edges %d, want the ready server's 3 and 3", len(graph.Nodes), len(graph.Edges))
	}
}

func TestChangeFlowSharesConcurrentRequestsAndCachesTheBuild(t *testing.T) {
	fixture := newFlowFixture(t)
	fixture.callChain()
	fixture.tsls.gate = make(chan struct{})

	var wait sync.WaitGroup
	graphs := make([]domain.FlowGraph, 3)
	for index := range graphs {
		wait.Go(func() {
			graphs[index] = fixture.flow(t, uncommitted)
		})
	}
	time.Sleep(50 * time.Millisecond)
	close(fixture.tsls.gate)
	wait.Wait()
	fixture.flow(t, uncommitted)

	for _, graph := range graphs {
		expectStrings(t, "edges", edgesOf(graph), edgesOf(graphs[0]))
	}
	if symbols := fixture.tsls.count("textDocument/documentSymbol"); symbols != 2 {
		t.Fatalf("documentSymbol requests = %d, want 2 from one build", symbols)
	}
}

func TestChangeFlowRebuildsAfterWorkspaceAndInstallChanges(t *testing.T) {
	fixture := newFlowFixture(t)
	fixture.callChain()

	fixture.flow(t, uncommitted)
	fixture.flow(t, uncommitted)
	afterCache := fixture.tsls.count("textDocument/documentSymbol")
	fixture.flows.WorkspaceChanged(t.Context(), domain.WorkspaceChange{})
	fixture.flow(t, uncommitted)
	afterWorkspace := fixture.tsls.count("textDocument/documentSymbol")
	fixture.installs.set("tsls", "2")
	fixture.flow(t, uncommitted)
	afterInstall := fixture.tsls.count("textDocument/documentSymbol")

	if afterCache != 2 || afterWorkspace != 4 || afterInstall != 6 {
		t.Fatalf("documentSymbol requests after cache %d, workspace %d, install %d, want 2, 4, 6", afterCache, afterWorkspace, afterInstall)
	}
	if fixture.pool.launches != 2 {
		t.Fatalf("sessions started = %d, want a new one for the new version", fixture.pool.launches)
	}
}

func TestChangeFlowAnswersPendingWhileTheBuildRuns(t *testing.T) {
	fixture := newFlowFixture(t)
	fixture.callChain()
	fixture.flows.wait = 20 * time.Millisecond
	fixture.tsls.gate = make(chan struct{})

	pending := fixture.flow(t, uncommitted)
	expectServers(t, pending, domain.FlowServer{Server: "tsls", Status: domain.ServerIndexing})
	if len(pending.Nodes) != 0 {
		t.Fatalf("pending graph has %d nodes, want none", len(pending.Nodes))
	}

	close(fixture.tsls.gate)
	deadline := time.Now().Add(5 * time.Second)
	graph := pending
	for time.Now().Before(deadline) && !graph.Settled() {
		graph = fixture.flow(t, uncommitted)
	}

	expectServers(t, graph, domain.FlowServer{Server: "tsls", Status: domain.ServerReady})
	if symbols := fixture.tsls.count("textDocument/documentSymbol"); symbols != 2 {
		t.Fatalf("documentSymbol requests = %d, want the retries to join one build", symbols)
	}
}

func TestChangeFlowRetriesAfterAFailedServer(t *testing.T) {
	fixture := newFlowFixture(t)
	fixture.callChain()
	fixture.pool.fail("tsls", errors.New("tsls crashed"))
	failed := fixture.flow(t, uncommitted)
	expectServers(t, failed, domain.FlowServer{Server: "tsls", Status: domain.ServerFailed, Error: "tsls crashed"})

	fixture.pool.fail("tsls", nil)
	graph := fixture.flow(t, uncommitted)

	expectServers(t, graph, domain.FlowServer{Server: "tsls", Status: domain.ServerReady})
}
