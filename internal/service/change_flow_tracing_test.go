package service

import (
	"errors"
	"slices"
	"strings"
	"testing"
	"testing/synctest"
	"time"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/lsp"
)

var (
	gdscriptReady = domain.FlowServer{Server: GodotServer, Status: domain.ServerReady}
	tslsStarting  = domain.FlowServer{Server: "tsls", Status: domain.ServerStarting}
)

func godotAndTypeScript(t *testing.T) *flowFixture {
	t.Helper()
	fixture := newFlowFixture(t)
	fixture.callChain()
	fixture.godotFile("game/project.godot", "")
	fixture.godotFile("game/state.gd", godotState)
	fixture.git.changes = append(fixture.git.changes, domain.WholeFileAdded("game/state.gd"))
	return fixture
}

func godotNodes(graph domain.FlowGraph) []string {
	return slices.DeleteFunc(nodesOf(graph), func(node string) bool {
		return !strings.HasPrefix(node, "game/")
	})
}

func TestChangeFlowShowsNoPartialGraphWhileAServerIsStarting(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		fixture := godotAndTypeScript(t)
		fixture.pool.fail("tsls", lsp.ErrStarting)

		starting := fixture.flow(t, uncommitted)

		expectServers(t, starting, gdscriptReady, tslsStarting)
		expectStrings(t, "nodes while tsls starts", nodesOf(starting), []string{})

		fixture.pool.fail("tsls", nil)
		graph := fixture.flow(t, uncommitted)

		expectServers(t, graph, gdscriptReady, tslsReady)
		if len(godotNodes(graph)) == 0 || len(graph.Nodes) == len(godotNodes(graph)) {
			t.Fatalf("nodes = %v, want the GDScript and TypeScript functions once every server is ready", nodesOf(graph))
		}
	})
}

func TestChangeFlowPendingRetryCarriesNoKeptResults(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		fixture := godotAndTypeScript(t)
		fixture.pool.fail("tsls", lsp.ErrStarting)
		fixture.flow(t, uncommitted)
		fixture.pool.fail("tsls", nil)
		fixture.git.contentsGate = make(chan struct{})

		results := fixture.request(t.Context())
		time.Sleep(fixture.flows.wait)
		pending := receive(t, results)

		expectServers(t, pending, tslsIndexing, gdscriptReady)
		expectStrings(t, "nodes while the retry walks tsls", nodesOf(pending), []string{})

		close(fixture.git.contentsGate)
		graph := fixture.flow(t, uncommitted)
		expectServers(t, graph, gdscriptReady, tslsReady)
	})
}

func TestChangeFlowKeepsTheLastCompleteGraphWhileARebuildStarts(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		fixture := godotAndTypeScript(t)
		complete := fixture.flow(t, uncommitted)
		expectServers(t, complete, gdscriptReady, tslsReady)

		fixture.changeWorkspace(t)
		fixture.pool.fail("tsls", lsp.ErrStarting)
		rebuilding := fixture.flow(t, uncommitted)

		expectServers(t, rebuilding, gdscriptReady, tslsStarting)
		expectStrings(t, "nodes of the last complete graph", nodesOf(rebuilding), nodesOf(complete))
	})
}

func TestChangeFlowShowsTheGraphOfAFailedServer(t *testing.T) {
	fixture := godotAndTypeScript(t)
	fixture.pool.fail("tsls", errors.New("tsls crashed"))

	graph := fixture.flow(t, uncommitted)

	expectServers(t, graph, gdscriptReady, domain.FlowServer{Server: "tsls", Status: domain.ServerFailed, Error: "tsls crashed"})
	if len(godotNodes(graph)) == 0 {
		t.Fatalf("nodes = %v, want the GDScript functions next to the failed server", nodesOf(graph))
	}
}
