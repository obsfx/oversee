package service

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"sync"
	"testing"
	"testing/synctest"
	"time"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/gdscript"
)

var callChainNodes = []string{
	"a.ts#1 entry function modified 1-5",
	"a.ts#7 helper function modified 7-9",
	"b.ts#1 util function added 1-3",
}

var tslsReady = domain.FlowServer{Server: "tsls", Status: domain.ServerReady}

var tslsIndexing = domain.FlowServer{Server: "tsls", Status: domain.ServerIndexing}

const (
	abandonAfter    = flowWait + 10*time.Second
	groupsAtOnce    = 4
	groupsInTheTest = groupsAtOnce + 2
)

type flowResult struct {
	graph domain.FlowGraph
	err   error
}

func (f *flowFixture) request(ctx context.Context) <-chan flowResult {
	results := make(chan flowResult, 1)
	go func() {
		graph, err := f.flows.Flow(ctx, uncommitted)
		results <- flowResult{graph: graph, err: err}
	}()
	return results
}

func receive(t *testing.T, results <-chan flowResult) domain.FlowGraph {
	t.Helper()
	result := <-results
	if result.err != nil {
		t.Fatalf("Flow: %v", result.err)
	}
	return result.graph
}

func (f *flowFixture) builds() (current, queued *flowBuild) {
	f.flows.mu.Lock()
	defer f.flows.mu.Unlock()
	flow, found := f.flows.flows[uncommitted]
	if !found {
		return nil, nil
	}
	return flow.current, flow.queued
}

func (f *flowFixture) holdSymbols(t *testing.T) func() {
	f.tsls.gate = make(chan struct{})
	release := sync.OnceFunc(func() {
		close(f.tsls.gate)
	})
	t.Cleanup(release)
	return release
}

func (f *flowFixture) changeWorkspace(t *testing.T) {
	f.flows.WorkspaceChanged(t.Context(), domain.WorkspaceChange{})
}

func (f *flowFixture) symbolWalks() (tsls, gopls int) {
	return f.tsls.count("textDocument/documentSymbol"), f.gopls.count("textDocument/documentSymbol")
}

func expectWalks(t *testing.T, fixture *flowFixture, wantTSLS, wantGopls int) {
	t.Helper()
	if tsls, gopls := fixture.symbolWalks(); tsls != wantTSLS || gopls != wantGopls {
		t.Fatalf("documentSymbol requests tsls %d gopls %d, want %d and %d", tsls, gopls, wantTSLS, wantGopls)
	}
}

func expectReadyChain(t *testing.T, graph domain.FlowGraph) {
	t.Helper()
	expectServers(t, graph, tslsReady)
	expectStrings(t, "nodes", nodesOf(graph), callChainNodes)
}

func TestChangeFlowQueuesNewerKeysBehindAGroupedBuild(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		fixture := newFlowFixture(t)
		fixture.callChain()
		fixture.git.contentsGate = make(chan struct{})

		first := fixture.request(t.Context())
		synctest.Wait()
		running, _ := fixture.builds()
		if !running.isGrouped() {
			t.Fatal("the first build has not reached grouping")
		}
		fixture.changeWorkspace(t)
		second := fixture.request(t.Context())
		synctest.Wait()
		_, replaced := fixture.builds()
		fixture.changeWorkspace(t)
		third := fixture.request(t.Context())
		synctest.Wait()
		current, queued := fixture.builds()

		if current != running || running.superseded.Load() {
			t.Fatal("a newer key cancelled the build that reached grouping")
		}
		if replaced == nil || queued == nil || queued == replaced {
			t.Fatalf("queued builds %p then %p, want the newest key to replace the queued one", replaced, queued)
		}
		if !replaced.superseded.Load() {
			t.Fatal("the replaced key is still waiting to start")
		}
		if calls := fixture.git.changedLinesCalls(); calls != 1 {
			t.Fatalf("ChangedLines calls = %d before the running build finished, want 1", calls)
		}

		close(fixture.git.contentsGate)
		for _, results := range []<-chan flowResult{first, second, third} {
			expectReadyChain(t, receive(t, results))
		}
		if calls := fixture.git.changedLinesCalls(); calls != 2 {
			t.Fatalf("ChangedLines calls = %d, want the running build and the newest key only", calls)
		}
		expectWalks(t, fixture, 4, 0)
	})
}

func TestChangeFlowCancelsABuildThatHasNotReachedGrouping(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		fixture := newFlowFixture(t)
		fixture.callChain()
		fixture.git.changedGate = make(chan struct{})

		first := fixture.request(t.Context())
		synctest.Wait()
		running, _ := fixture.builds()
		fixture.changeWorkspace(t)
		second := fixture.request(t.Context())
		synctest.Wait()
		current, queued := fixture.builds()

		if !running.superseded.Load() || !running.finished() {
			t.Fatal("the build before grouping kept running after a newer key")
		}
		if current == running || queued != nil {
			t.Fatal("the newer key waited behind a build that had not reached grouping")
		}

		close(fixture.git.changedGate)
		for _, results := range []<-chan flowResult{first, second} {
			expectReadyChain(t, receive(t, results))
		}
		expectWalks(t, fixture, 2, 0)
	})
}

func TestChangeFlowAnswersTheLastGraphWhileItRebuilds(t *testing.T) {
	tests := []struct {
		name        string
		hold        func(git *fakeFlowGit, gate chan struct{})
		wantServers []domain.FlowServer
	}{
		{
			name: "rebuild before grouping reports the servers of the last graph",
			hold: func(git *fakeFlowGit, gate chan struct{}) {
				git.changedGate = gate
			},
			wantServers: []domain.FlowServer{tslsIndexing},
		},
		{
			name: "rebuild past grouping reports the servers of the rebuild",
			hold: func(git *fakeFlowGit, gate chan struct{}) {
				git.contentsGate = gate
			},
			wantServers: []domain.FlowServer{tslsIndexing, {Server: "gopls", Status: domain.ServerIndexing}},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			synctest.Test(t, func(t *testing.T) {
				fixture := newFlowFixture(t)
				fixture.callChain()
				ready := fixture.flow(t, uncommitted)
				gate := make(chan struct{})
				test.hold(fixture.git, gate)
				fixture.installs.set("gopls", "1")
				fixture.change(domain.LineChanges{Path: "cmd/main.go", Status: domain.ChangeModified, Hunks: []domain.LineHunk{{OldStart: 1, OldLines: 1, NewStart: 1, NewLines: 1}}})
				fixture.changeWorkspace(t)

				rebuilding := fixture.flow(t, uncommitted)

				expectServers(t, rebuilding, test.wantServers...)
				expectStrings(t, "nodes", nodesOf(rebuilding), nodesOf(ready))
				expectStrings(t, "edges", edgesOf(rebuilding), edgesOf(ready))
				if fmt.Sprint(rebuilding.Origins) != fmt.Sprint(ready.Origins) {
					t.Fatalf("origins = %+v, want the last graph's %+v", rebuilding.Origins, ready.Origins)
				}

				close(gate)
				rebuilt := fixture.flow(t, uncommitted)

				expectServers(t, rebuilt, tslsReady, domain.FlowServer{Server: "gopls", Status: domain.ServerReady})
				expectStrings(t, "nodes", nodesOf(rebuilt), callChainNodes)
				expectWalks(t, fixture, 4, 1)
			})
		})
	}
}

func TestChangeFlowAnswersThePendingGraphOnceGroupedWithoutALastGraph(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		fixture := newFlowFixture(t)
		fixture.callChain()
		fixture.git.changedGate = make(chan struct{})
		fixture.git.contentsGate = make(chan struct{})

		results := fixture.request(t.Context())
		time.Sleep(fixture.flows.wait)
		synctest.Wait()
		select {
		case <-results:
			t.Fatal("answered before the build grouped its servers")
		default:
		}

		close(fixture.git.changedGate)
		pending := receive(t, results)

		expectServers(t, pending, tslsIndexing)
		expectStrings(t, "nodes", nodesOf(pending), []string{})

		close(fixture.git.contentsGate)
		expectReadyChain(t, fixture.flow(t, uncommitted))
		expectWalks(t, fixture, 2, 0)
	})
}

func expectRunning(t *testing.T, fixture *flowFixture, running, queued *flowBuild) {
	t.Helper()
	current, nowQueued := fixture.builds()
	if current != running || nowQueued != queued || running.superseded.Load() || queued.superseded.Load() || running.finished() {
		t.Fatal("the builds were abandoned before the idle period passed")
	}
}

func TestChangeFlowAbandonsBuildsNoRequestAwaits(t *testing.T) {
	tests := []struct {
		name    string
		between func(t *testing.T, fixture *flowFixture, running, queued *flowBuild)
	}{
		{
			name: "no request after the last one gave up",
		},
		{
			name: "a request inside the idle period postpones it",
			between: func(t *testing.T, fixture *flowFixture, running, queued *flowBuild) {
				time.Sleep(abandonAfter - time.Second)
				pending := fixture.flow(t, uncommitted)
				expectServers(t, pending, tslsIndexing)
				expectRunning(t, fixture, running, queued)
			},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			synctest.Test(t, func(t *testing.T) {
				fixture := newFlowFixture(t)
				fixture.callChain()
				fixture.git.contentsGate = make(chan struct{})
				ctx, cancel := context.WithCancel(t.Context())
				first := fixture.request(ctx)
				synctest.Wait()
				fixture.changeWorkspace(t)
				second := fixture.request(ctx)
				synctest.Wait()
				running, queued := fixture.builds()
				if running == nil || queued == nil {
					t.Fatal("want a running build and a queued key")
				}

				cancel()
				for _, results := range []<-chan flowResult{first, second} {
					if result := <-results; !errors.Is(result.err, context.Canceled) {
						t.Fatalf("Flow error = %v, want context.Canceled", result.err)
					}
				}
				if test.between != nil {
					test.between(t, fixture, running, queued)
				}
				time.Sleep(abandonAfter - time.Nanosecond)
				synctest.Wait()
				expectRunning(t, fixture, running, queued)

				time.Sleep(time.Nanosecond)
				synctest.Wait()
				_, nowQueued := fixture.builds()
				if !running.superseded.Load() || !running.finished() {
					t.Fatal("the running build was not cancelled after the idle period")
				}
				if nowQueued != nil || !queued.superseded.Load() {
					t.Fatal("the queued key was not dropped after the idle period")
				}
				if calls := fixture.git.changedLinesCalls(); calls != 1 {
					t.Fatalf("ChangedLines calls = %d, want the queued key never started", calls)
				}

				close(fixture.git.contentsGate)
				expectReadyChain(t, fixture.flow(t, uncommitted))
			})
		})
	}
}

func TestChangeFlowReusesSettledGroupsOfTheGeneration(t *testing.T) {
	fixture := newFlowFixture(t)
	fixture.callChain()
	fixture.installs.set("gopls", "1")
	run := []fakeSymbol{{name: "run", kind: symbolKindFunction, start: 0, end: 3}}
	fixture.gopls.symbols["cmd/main.go"] = run
	fixture.tsls.symbols["cmd/main.go"] = run
	fixture.tsls.calls["a.ts#entry"] = append(fixture.tsls.calls["a.ts#entry"], fakeCall{key: "cmd/main.go#run", line: 3})
	fixture.change(domain.LineChanges{Path: "cmd/main.go", Status: domain.ChangeModified, Hunks: []domain.LineHunk{{OldStart: 2, OldLines: 1, NewStart: 2, NewLines: 1}}})
	fixture.pool.fail("gopls", errors.New("gopls crashed"))

	failed := fixture.flow(t, uncommitted)

	expectServers(t, failed, tslsReady, domain.FlowServer{Server: "gopls", Status: domain.ServerFailed, Error: "gopls crashed"})
	expectWalks(t, fixture, 2, 0)

	fixture.pool.fail("gopls", nil)
	graph := fixture.flow(t, uncommitted)

	expectServers(t, graph, tslsReady, domain.FlowServer{Server: "gopls", Status: domain.ServerReady})
	expectWalks(t, fixture, 2, 1)
	expectStrings(t, "nodes", nodesOf(graph), []string{
		"a.ts#1 entry function modified 1-5",
		"a.ts#7 helper function modified 7-9",
		"b.ts#1 util function added 1-3",
		"cmd/main.go#1 run function modified 1-4",
	})
	expectStrings(t, "edges", edgesOf(graph), []string{
		"a.ts#1 -> a.ts#7 :3 call",
		"a.ts#1 -> b.ts#1 :4 call",
		"a.ts#1 -> cmd/main.go#1 :4 call",
		"a.ts#7 -> b.ts#1 :8 call",
	})

	fixture.changeWorkspace(t)
	fixture.flow(t, uncommitted)

	expectWalks(t, fixture, 4, 2)
}

func TestChangeFlowRebuildsOnlyForInstallsOfItsServers(t *testing.T) {
	goChange := domain.LineChanges{Path: "cmd/main.go", Status: domain.ChangeModified, Hunks: []domain.LineHunk{{OldStart: 1, OldLines: 1, NewStart: 1, NewLines: 1}}}
	tests := []struct {
		name        string
		goChanged   bool
		install     func(installs *fakeInstalls)
		wantServers []domain.FlowServer
		wantTSLS    int
		wantGopls   int
	}{
		{
			name: "an install of a server without changed files keeps the build",
			install: func(installs *fakeInstalls) {
				installs.set("gopls", "1")
			},
			wantServers: []domain.FlowServer{tslsReady},
			wantTSLS:    2,
		},
		{
			name: "an update of a changed file's server rebuilds",
			install: func(installs *fakeInstalls) {
				installs.set("tsls", "2")
			},
			wantServers: []domain.FlowServer{tslsReady},
			wantTSLS:    4,
		},
		{
			name:      "an install of a changed file's missing server rebuilds",
			goChanged: true,
			install: func(installs *fakeInstalls) {
				installs.set("gopls", "1")
			},
			wantServers: []domain.FlowServer{tslsReady, {Server: "gopls", Status: domain.ServerReady}},
			wantTSLS:    2,
			wantGopls:   1,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			fixture := newFlowFixture(t)
			fixture.callChain()
			if test.goChanged {
				fixture.change(goChange)
			}
			before := fixture.flow(t, uncommitted)
			expectWalks(t, fixture, 2, 0)

			test.install(fixture.installs)
			after := fixture.flow(t, uncommitted)

			expectServers(t, after, test.wantServers...)
			expectStrings(t, "nodes", nodesOf(after), nodesOf(before))
			expectWalks(t, fixture, test.wantTSLS, test.wantGopls)
		})
	}
}

type directoryRoots struct {
	fakeProjectFiles
}

func (directoryRoots) RootOf(file string, _ []string) string {
	return filepath.Dir(file)
}

func TestChangeFlowWalksAtMostFourGroupsAtOnce(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		fixture := newFlowFixture(t)
		project := directoryRoots{fakeProjectFiles{root: fixture.tsls.root}}
		fixture.flows = NewChangeFlowService(flowCatalog, fixture.git, fixture.installs, unusedLauncher{}, project, fixture.pool, gdscript.NewAnalyzer())
		t.Cleanup(fixture.flows.Close)
		var want []string
		for index := range groupsInTheTest {
			path := fmt.Sprintf("pkg%d/a.ts", index)
			fixture.tsls.symbols[path] = []fakeSymbol{{name: "entry", kind: symbolKindFunction, start: 0, end: 2}}
			fixture.change(domain.WholeFileAdded(path))
			want = append(want, path+"#1 entry function added 1-3")
		}
		release := fixture.holdSymbols(t)

		results := fixture.request(t.Context())
		synctest.Wait()
		if active, _ := fixture.tsls.symbolRequests(); active != groupsAtOnce {
			t.Fatalf("groups walking at once = %d, want %d", active, groupsAtOnce)
		}

		release()
		graph := receive(t, results)

		if _, peak := fixture.tsls.symbolRequests(); peak != groupsAtOnce {
			t.Fatalf("peak groups walking at once = %d, want %d", peak, groupsAtOnce)
		}
		expectServers(t, graph, tslsReady)
		expectStrings(t, "nodes", nodesOf(graph), want)
		expectWalks(t, fixture, groupsInTheTest, 0)
	})
}
