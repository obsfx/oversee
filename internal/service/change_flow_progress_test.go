package service

import (
	"cmp"
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"testing/synctest"
	"time"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/gdscript"
)

var callChainWalk = []string{
	"tsls starting 0/0",
	"tsls reading 0/2",
	"tsls reading 1/2",
	"tsls reading 2/2",
	"tsls tracing 0/3",
	"tsls tracing 1/3",
	"tsls tracing 2/3",
	"tsls tracing 3/3",
	"tsls done 0/0",
}

type steppingClock struct {
	now       atomic.Int64
	scheduled atomic.Int32
}

func (c *steppingClock) Now() time.Time {
	return time.Unix(0, c.now.Add(int64(progressInterval)))
}

func (c *steppingClock) AfterFunc(time.Duration, func()) stopper {
	c.scheduled.Add(1)
	return idleStopper{}
}

type idleStopper struct{}

func (idleStopper) Stop() bool {
	return false
}

type progressRecorder struct {
	comparison domain.Comparison
	stepping   *steppingClock
	observe    func() string
	mu         sync.Mutex
	signals    []string
}

func (f *flowFixture) recordProgress(comparison domain.Comparison) *progressRecorder {
	stepping := &steppingClock{}
	return f.record(&progressRecorder{comparison: comparison, stepping: stepping}, stepping)
}

func (f *flowFixture) recordThrottledProgress(comparison domain.Comparison) *progressRecorder {
	return f.record(&progressRecorder{comparison: comparison}, systemClock{})
}

func (f *flowFixture) record(recorder *progressRecorder, clock clock) *progressRecorder {
	f.flows.mu.Lock()
	defer f.flows.mu.Unlock()
	f.flows.flows[recorder.comparison] = &comparisonFlow{reporter: newFlowReporter(recorder.comparison, clock, recorder.publish)}
	return recorder
}

func (r *progressRecorder) publish(progress domain.FlowProgress) {
	signal := progressLine(progress)
	if progress.Comparison != r.comparison {
		signal = fmt.Sprintf("%s for %s..%s", signal, progress.Comparison.Source, progress.Comparison.Target)
	}
	if r.observe != nil {
		signal += " " + r.observe()
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.signals = append(r.signals, signal)
}

func (r *progressRecorder) take(t *testing.T) []string {
	t.Helper()
	if r.stepping != nil && r.stepping.scheduled.Load() > 0 {
		t.Errorf("trailing signals scheduled = %d, want every change sent at once", r.stepping.scheduled.Load())
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	signals := slices.Compact(r.signals)
	r.signals = nil
	return signals
}

func progressLine(progress domain.FlowProgress) string {
	if len(progress.Servers) == 0 {
		return "none"
	}
	servers := make([]string, 0, len(progress.Servers))
	for _, server := range progress.Servers {
		servers = append(servers, fmt.Sprintf("%s %s %d/%d", server.Server, server.Phase, server.Done, server.Total))
	}
	return strings.Join(servers, ", ")
}

func TestChangeFlowProgressFollowsEveryStepOfABuild(t *testing.T) {
	fixture := newFlowFixture(t)
	fixture.callChain()
	recorder := fixture.recordProgress(uncommitted)

	fixture.flow(t, uncommitted)

	expectStrings(t, "progress", recorder.take(t), slices.Concat([]string{"none"}, callChainWalk))
}

func TestChangeFlowProgressThrottlesABuildToItsLatestState(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		fixture := newFlowFixture(t)
		fixture.callChain()
		release := fixture.holdSymbols(t)
		recorder := fixture.recordThrottledProgress(uncommitted)

		results := fixture.request(t.Context())
		time.Sleep(progressInterval)
		synctest.Wait()

		expectStrings(t, "progress while the first file is read", recorder.take(t), []string{"none", "tsls starting 0/0", "tsls reading 0/2"})

		release()
		receive(t, results)

		expectStrings(t, "progress when the build ends", recorder.take(t), []string{"tsls done 0/0"})

		time.Sleep(time.Second)
		synctest.Wait()

		expectStrings(t, "progress after the end", recorder.take(t), []string{})
	})
}

func TestChangeFlowProgressGroupsEveryServer(t *testing.T) {
	goChange := domain.LineChanges{Path: "cmd/main.go", Status: domain.ChangeModified, Hunks: []domain.LineHunk{{OldStart: 1, OldLines: 1, NewStart: 1, NewLines: 1}}}
	tests := []struct {
		name         string
		comparison   domain.Comparison
		setup        func(t *testing.T, fixture *flowFixture)
		wantGrouping string
		wantEnd      string
	}{
		{
			name: "a server that is not installed is done at grouping",
			setup: func(_ *testing.T, fixture *flowFixture) {
				fixture.change(goChange)
			},
			wantGrouping: "gopls done 0/0, tsls starting 0/0",
			wantEnd:      "gopls done 0/0, tsls done 0/0",
		},
		{
			name: "a server whose installation lookup failed is done at grouping",
			setup: func(_ *testing.T, fixture *flowFixture) {
				fixture.installs.fail("gopls", errors.New("manifest unreadable"))
				fixture.change(goChange)
			},
			wantGrouping: "gopls done 0/0, tsls starting 0/0",
			wantEnd:      "gopls done 0/0, tsls done 0/0",
		},
		{
			name:         "servers of a comparison that is not checked out are done at grouping",
			comparison:   domain.Comparison{Source: "feature", Target: "main"},
			wantGrouping: "tsls done 0/0",
			wantEnd:      "tsls done 0/0",
		},
		{
			name: "a group kept from an earlier build is done at grouping",
			setup: func(t *testing.T, fixture *flowFixture) {
				fixture.installs.set("gopls", "1")
				fixture.gopls.symbols["cmd/main.go"] = []fakeSymbol{{name: "run", kind: symbolKindFunction, start: 0, end: 3}}
				fixture.change(goChange)
				fixture.pool.fail("gopls", errors.New("gopls crashed"))
				fixture.flow(t, uncommitted)
				fixture.pool.fail("gopls", nil)
			},
			wantGrouping: "gopls starting 0/0, tsls done 0/0",
			wantEnd:      "gopls done 0/0, tsls done 0/0",
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			fixture := newFlowFixture(t)
			fixture.callChain()
			comparison := cmp.Or(test.comparison, uncommitted)
			recorder := fixture.recordProgress(comparison)
			if test.setup != nil {
				test.setup(t, fixture)
			}
			recorder.take(t)

			fixture.flow(t, comparison)

			signals := recorder.take(t)
			if len(signals) < 2 || signals[0] != "none" || signals[1] != test.wantGrouping || signals[len(signals)-1] != test.wantEnd {
				t.Fatalf("progress = %q, want none, then %q, ending with %q", signals, test.wantGrouping, test.wantEnd)
			}
		})
	}
}

func TestChangeFlowProgressKeepsGDScriptStartingUntilItsAnalysisEnds(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		fixture := newFlowFixture(t)
		release := make(chan struct{})
		fixture.flows = NewChangeFlowService(flowCatalog, fixture.git, fixture.installs, unusedLauncher{}, fakeProjectFiles{root: fixture.tsls.root}, fixture.pool, blockingAnalyzer{release: release, inner: gdscript.NewAnalyzer()})
		t.Cleanup(fixture.flows.Close)
		fixture.callChain()
		fixture.godotFile("player.gd", godotPlayer)
		fixture.git.changes = append(fixture.git.changes, domain.WholeFileAdded("player.gd"))
		recorder := fixture.recordProgress(uncommitted)

		results := fixture.request(t.Context())
		synctest.Wait()

		want := []string{"none"}
		for _, step := range callChainWalk {
			want = append(want, "gdscript starting 0/0, "+step)
		}
		expectStrings(t, "progress while GDScript is analyzed", recorder.take(t), want)

		close(release)
		receive(t, results)

		expectStrings(t, "progress after the analysis", recorder.take(t), []string{"gdscript done 0/0, tsls done 0/0"})
	})
}

func TestChangeFlowProgressReportsNothingForACachedAnswer(t *testing.T) {
	fixture := newFlowFixture(t)
	fixture.callChain()
	recorder := fixture.recordProgress(uncommitted)
	fixture.flow(t, uncommitted)
	recorder.take(t)

	fixture.flow(t, uncommitted)

	expectStrings(t, "progress of a cached answer", recorder.take(t), []string{})
	expectWalks(t, fixture, 2, 0)
}

func TestChangeFlowProgressReportsAQueuedBuildOnceItStarts(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		fixture := newFlowFixture(t)
		fixture.callChain()
		fixture.git.contentsGate = make(chan struct{})
		recorder := fixture.recordProgress(uncommitted)

		first := fixture.request(t.Context())
		synctest.Wait()

		expectStrings(t, "progress of the running build", recorder.take(t), []string{"none", "tsls starting 0/0"})

		fixture.changeWorkspace(t)
		second := fixture.request(t.Context())
		synctest.Wait()

		if _, queued := fixture.builds(); queued == nil {
			t.Fatal("the newer key did not queue behind the grouped build")
		}
		expectStrings(t, "progress while a build is queued", recorder.take(t), []string{})

		close(fixture.git.contentsGate)
		receive(t, first)
		receive(t, second)

		expectStrings(t, "progress after the running build", recorder.take(t), slices.Concat(callChainWalk[1:], []string{"none"}, callChainWalk))
	})
}

func TestChangeFlowProgressDropsASupersededBuild(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		fixture := newFlowFixture(t)
		fixture.callChain()
		stubborn := make(chan struct{})
		fixture.git.changedHolds = map[int]chan struct{}{1: stubborn}
		fixture.git.changedGate = make(chan struct{})
		recorder := fixture.recordProgress(uncommitted)

		first := fixture.request(t.Context())
		synctest.Wait()
		superseded, _ := fixture.builds()

		expectStrings(t, "progress of the first build", recorder.take(t), []string{"none"})

		fixture.changeWorkspace(t)
		second := fixture.request(t.Context())
		synctest.Wait()

		expectStrings(t, "progress of the newer build", recorder.take(t), []string{"none"})

		close(stubborn)
		synctest.Wait()

		if !superseded.superseded.Load() || !superseded.finished() {
			t.Fatal("the superseded build did not run to its end")
		}
		expectStrings(t, "progress of the superseded build", recorder.take(t), []string{})

		close(fixture.git.changedGate)
		receive(t, first)
		receive(t, second)

		expectStrings(t, "progress of the newer build", recorder.take(t), callChainWalk)
	})
}

func TestChangeFlowFollowDeliversTheLatestProgressPerComparison(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		fixture := newFlowFixture(t)
		fixture.callChain()
		feature := domain.Comparison{Source: "feature", Target: "main"}
		ctx, cancel := context.WithCancel(t.Context())
		delivered := make(chan domain.FlowProgress)
		followed := make(chan struct{})
		go func() {
			defer close(followed)
			fixture.flows.Follow(ctx, func(progress domain.FlowProgress) {
				select {
				case delivered <- progress:
				case <-ctx.Done():
				}
			})
		}()
		slow := domain.FlowProgress{Comparison: domain.Comparison{Source: "slow", Target: "main"}}
		fixture.flows.feed.push(slow)
		synctest.Wait()

		fixture.flow(t, uncommitted)
		fixture.flow(t, feature)

		if progress := <-delivered; progress.Comparison != slow.Comparison {
			t.Fatalf("first delivery = %+v, want the progress the follower was publishing", progress)
		}
		var latest []string
		for range 2 {
			progress := <-delivered
			latest = append(latest, fmt.Sprintf("%s..%s %s", progress.Comparison.Source, progress.Comparison.Target, progressLine(progress)))
		}
		slices.Sort(latest)
		expectStrings(t, "latest progress per comparison", latest, []string{
			":uncommitted..main tsls done 0/0",
			"feature..main tsls done 0/0",
		})

		synctest.Wait()
		select {
		case progress := <-delivered:
			t.Fatalf("delivered %+v after the latest states", progress)
		default:
		}
		cancel()
		<-followed
	})
}

func TestChangeFlowProgressTracesAFunctionOnceItsWalkIsComplete(t *testing.T) {
	tests := []struct {
		name  string
		setup func(tsls *fakeLanguageServer)
		want  []string
	}{
		{
			name: "a function dropped by prepare is traced at once and an entry point after its references",
			setup: func(tsls *fakeLanguageServer) {
				tsls.symbols["a.ts"] = []fakeSymbol{
					{name: "entry", kind: symbolKindFunction, start: 0, end: 2},
					{name: "orphan", kind: symbolKindFunction, start: 4, end: 6},
				}
				tsls.emptyPrepare["a.ts#orphan"] = true
			},
			want: []string{
				"tsls tracing 0/2 out=0 in=0 refs=0",
				"tsls tracing 1/2 out=0 in=0 refs=0",
				"tsls tracing 2/2 out=1 in=1 refs=1",
			},
		},
		{
			name: "a callee walked before its caller is traced once the caller links it",
			setup: func(tsls *fakeLanguageServer) {
				tsls.symbols["a.ts"] = []fakeSymbol{
					{name: "callee", kind: symbolKindFunction, start: 0, end: 2},
					{name: "caller", kind: symbolKindFunction, start: 4, end: 6},
				}
				tsls.symbols["c.ts"] = []fakeSymbol{{name: "main", kind: symbolKindFunction, start: 0, end: 30}}
				tsls.calls["a.ts#caller"] = []fakeCall{{key: "a.ts#callee", line: 5}}
				tsls.callers["a.ts#caller"] = []fakeCall{{key: "c.ts#main", line: 20}}
			},
			want: []string{
				"tsls tracing 0/2 out=0 in=0 refs=0",
				"tsls tracing 1/2 out=2 in=0 refs=0",
				"tsls tracing 2/2 out=2 in=1 refs=0",
			},
		},
		{
			name: "a callee linked before its calls are walked is traced once they are",
			setup: func(tsls *fakeLanguageServer) {
				tsls.symbols["a.ts"] = []fakeSymbol{
					{name: "caller", kind: symbolKindFunction, start: 0, end: 2},
					{name: "callee", kind: symbolKindFunction, start: 4, end: 6},
				}
				tsls.symbols["c.ts"] = []fakeSymbol{{name: "main", kind: symbolKindFunction, start: 0, end: 30}}
				tsls.calls["a.ts#caller"] = []fakeCall{{key: "a.ts#callee", line: 1}}
				tsls.callers["a.ts#caller"] = []fakeCall{{key: "c.ts#main", line: 20}}
			},
			want: []string{
				"tsls tracing 0/2 out=0 in=0 refs=0",
				"tsls tracing 1/2 out=2 in=0 refs=0",
				"tsls tracing 2/2 out=2 in=1 refs=0",
			},
		},
		{
			name: "a callee with two callers in the group is traced once",
			setup: func(tsls *fakeLanguageServer) {
				tsls.symbols["a.ts"] = []fakeSymbol{
					{name: "callee", kind: symbolKindFunction, start: 0, end: 2},
					{name: "first", kind: symbolKindFunction, start: 4, end: 6},
					{name: "second", kind: symbolKindFunction, start: 8, end: 10},
				}
				tsls.symbols["c.ts"] = []fakeSymbol{{name: "main", kind: symbolKindFunction, start: 0, end: 30}}
				tsls.calls["a.ts#first"] = []fakeCall{{key: "a.ts#callee", line: 5}}
				tsls.calls["a.ts#second"] = []fakeCall{{key: "a.ts#callee", line: 9}}
				tsls.callers["a.ts#first"] = []fakeCall{{key: "c.ts#main", line: 20}}
				tsls.callers["a.ts#second"] = []fakeCall{{key: "c.ts#main", line: 21}}
			},
			want: []string{
				"tsls tracing 0/3 out=0 in=0 refs=0",
				"tsls tracing 1/3 out=2 in=0 refs=0",
				"tsls tracing 2/3 out=3 in=1 refs=0",
				"tsls tracing 3/3 out=3 in=2 refs=0",
			},
		},
		{
			name: "mutually recursive functions nobody else calls are traced once each by their calls",
			setup: func(tsls *fakeLanguageServer) {
				tsls.symbols["a.ts"] = []fakeSymbol{
					{name: "ping", kind: symbolKindFunction, start: 0, end: 2},
					{name: "pong", kind: symbolKindFunction, start: 4, end: 6},
				}
				tsls.calls["a.ts#ping"] = []fakeCall{{key: "a.ts#pong", line: 1}}
				tsls.calls["a.ts#pong"] = []fakeCall{{key: "a.ts#ping", line: 5}}
			},
			want: []string{
				"tsls tracing 0/2 out=0 in=0 refs=0",
				"tsls tracing 1/2 out=2 in=0 refs=0",
				"tsls tracing 2/2 out=2 in=0 refs=0",
			},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			fixture := newFlowFixture(t)
			test.setup(fixture.tsls)
			fixture.change(domain.WholeFileAdded("a.ts"))
			recorder := fixture.recordProgress(uncommitted)
			recorder.observe = func() string {
				return fmt.Sprintf("out=%d in=%d refs=%d",
					fixture.tsls.count("callHierarchy/outgoingCalls"),
					fixture.tsls.count("callHierarchy/incomingCalls"),
					fixture.tsls.count("textDocument/references"))
			}

			fixture.flow(t, uncommitted)

			var tracing []string
			for _, signal := range recorder.take(t) {
				if strings.Contains(signal, " tracing ") {
					tracing = append(tracing, signal)
				}
			}
			expectStrings(t, "tracing progress", tracing, test.want)
		})
	}
}
