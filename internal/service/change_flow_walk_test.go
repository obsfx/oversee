package service

import (
	"fmt"
	"slices"
	"strings"
	"testing"
	"testing/synctest"
	"time"

	"github.com/obsfx/oversee/internal/domain"
)

const (
	symbolKindProperty    = 7
	symbolKindField       = 8
	symbolKindConstructor = 9
	symbolKindVariable    = 13
	symbolKindConstant    = 14
	pastWarmup            = time.Minute
)

func (f *flowFixture) keptCrossings() []string {
	f.flows.mu.Lock()
	defer f.flows.mu.Unlock()
	var crossings []string
	for _, result := range f.flows.flows[uncommitted].kept.groups {
		crossings = append(crossings, edgesOf(domain.FlowGraph{Edges: result.crossings})...)
	}
	slices.Sort(crossings)
	return crossings
}

func TestChangeFlowKeepsCallablesWithoutCallHierarchyAndDropsPlainValues(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		fixture := newFlowFixture(t)
		fixture.tsls.symbols["a.ts"] = []fakeSymbol{
			{name: "entry", kind: symbolKindFunction, start: 0, end: 2},
			{name: "orphan", kind: symbolKindFunction, start: 4, end: 6},
			{name: "config", kind: symbolKindVariable, start: 8, end: 10},
			{name: "settings", kind: symbolKindConstant, start: 12, end: 14},
			{name: "useThing", kind: symbolKindVariable, start: 16, end: 18},
			{name: "handler", kind: symbolKindVariable, start: 20, end: 22},
			{name: "helper", kind: symbolKindFunction, start: 24, end: 26},
		}
		fixture.tsls.symbols["view.tsx"] = []fakeSymbol{{name: "Panel", kind: symbolKindVariable, start: 0, end: 3}}
		fixture.tsls.calls["a.ts#entry"] = []fakeCall{{key: "a.ts#helper", line: 1}}
		fixture.tsls.calls["a.ts#handler"] = []fakeCall{{key: "a.ts#helper", line: 21}}
		fixture.tsls.failedPrepare["a.ts#orphan"] = true
		fixture.tsls.emptyPrepare["a.ts#config"] = true
		fixture.tsls.failedPrepare["a.ts#settings"] = true
		fixture.tsls.emptyPrepare["a.ts#useThing"] = true
		fixture.tsls.emptyPrepare["view.tsx#Panel"] = true
		fixture.change(domain.WholeFileAdded("a.ts"), domain.WholeFileAdded("view.tsx"))

		warming := fixture.flow(t, uncommitted)

		expectServers(t, warming, tslsIndexing)
		expectStrings(t, "nodes while the server warms up", nodesOf(warming), []string{})

		time.Sleep(pastWarmup)
		outgoingBefore := fixture.tsls.count("callHierarchy/outgoingCalls")
		graph := fixture.flow(t, uncommitted)

		expectServers(t, graph, tslsReady)
		expectStrings(t, "nodes", nodesOf(graph), []string{
			"a.ts#1 entry function added 1-3",
			"a.ts#5 orphan function added 5-7",
			"a.ts#17 useThing hook added 17-19",
			"a.ts#21 handler function added 21-23",
			"a.ts#25 helper function added 25-27",
			"view.tsx#1 Panel component added 1-4",
		})
		expectStrings(t, "edges", edgesOf(graph), []string{
			"a.ts#1 -> a.ts#25 :2 call",
			"a.ts#21 -> a.ts#25 :22 call",
		})
		if outgoing := fixture.tsls.count("callHierarchy/outgoingCalls") - outgoingBefore; outgoing != 3 {
			t.Fatalf("outgoingCalls requests = %d, want one per prepared unit", outgoing)
		}
	})
}

func TestChangeFlowSkipsCalleesOutsideTheRepository(t *testing.T) {
	fixture := newFlowFixture(t)
	fixture.tsls.symbols["a.ts"] = []fakeSymbol{
		{name: "entry", kind: symbolKindFunction, start: 0, end: 4},
		{name: "untouched", kind: symbolKindFunction, start: 10, end: 12},
	}
	fixture.tsls.symbols["b.ts"] = []fakeSymbol{{name: "util", kind: symbolKindFunction, start: 0, end: 2}}
	fixture.tsls.symbols["node_modules/lib/index.ts"] = []fakeSymbol{{name: "parse", kind: symbolKindMethod, start: 3, end: 5}}
	fixture.tsls.symbols["../sdk/client.ts"] = []fakeSymbol{{name: "fetch", kind: symbolKindMethod, start: 7, end: 9}}
	fixture.tsls.calls["a.ts#entry"] = []fakeCall{
		{key: "a.ts#untouched", line: 1},
		{key: "node_modules/lib/index.ts#parse", line: 2},
		{key: "../sdk/client.ts#fetch", line: 3},
		{key: "b.ts#util", line: 4},
	}
	fixture.change(
		domain.LineChanges{Path: "a.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{{OldStart: 2, OldLines: 1, NewStart: 2, NewLines: 1}}},
		domain.WholeFileAdded("b.ts"),
	)

	graph := fixture.flow(t, uncommitted)

	expectServers(t, graph, tslsReady)
	expectStrings(t, "edges", edgesOf(graph), []string{"a.ts#1 -> b.ts#1 :5 call"})
	expectStrings(t, "crossings", fixture.keptCrossings(), []string{"a.ts#1 -> a.ts#11 :2 call"})
	expectStrings(t, "implementation lookups", fixture.tsls.implementationLookups(), []string{"a.ts#untouched", "b.ts#util"})
}

func TestChangeFlowLooksUpImplementationsByCalleeKind(t *testing.T) {
	implemented := []string{"a.ts#1 -> file-store.ts#3 :3 implementation"}
	tests := []struct {
		name        string
		kind        int
		wantEdges   []string
		wantLookups []string
	}{
		{name: "function", kind: symbolKindFunction, wantEdges: implemented, wantLookups: []string{"store.ts#save"}},
		{name: "method", kind: symbolKindMethod, wantEdges: implemented, wantLookups: []string{"store.ts#save"}},
		{name: "interface", kind: symbolKindInterface, wantEdges: implemented, wantLookups: []string{"store.ts#save"}},
		{name: "property", kind: symbolKindProperty, wantEdges: implemented, wantLookups: []string{"store.ts#save"}},
		{name: "field", kind: symbolKindField, wantEdges: implemented, wantLookups: []string{"store.ts#save"}},
		{name: "class", kind: symbolKindClass},
		{name: "constructor", kind: symbolKindConstructor},
		{name: "variable", kind: symbolKindVariable},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			fixture := newFlowFixture(t)
			fixture.tsls.symbols["a.ts"] = []fakeSymbol{{name: "entry", kind: symbolKindFunction, start: 0, end: 4}}
			fixture.tsls.symbols["store.ts"] = []fakeSymbol{{name: "save", kind: test.kind, start: 1, end: 1}}
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

			expectServers(t, graph, tslsReady)
			expectStrings(t, "edges", edgesOf(graph), append([]string{}, test.wantEdges...))
			expectStrings(t, "implementation lookups", fixture.tsls.implementationLookups(), append([]string{}, test.wantLookups...))
		})
	}
}

func TestChangeFlowLabelsAddedAndModifiedUnits(t *testing.T) {
	tests := []struct {
		name     string
		change   domain.LineChanges
		previous []fakeSymbol
		want     domain.FlowChange
	}{
		{
			name:   "every line added to a modified file",
			change: domain.LineChanges{Status: domain.ChangeModified, Hunks: []domain.LineHunk{{OldStart: 4, NewStart: 5, NewLines: 4}}},
			want:   domain.FlowAdded,
		},
		{
			name:     "every line new where another function was replaced",
			change:   domain.LineChanges{Status: domain.ChangeModified, Hunks: []domain.LineHunk{{OldStart: 5, OldLines: 3, NewStart: 5, NewLines: 4}}},
			previous: []fakeSymbol{{name: "legacy", kind: symbolKindFunction, start: 4, end: 6}},
			want:     domain.FlowAdded,
		},
		{
			name:     "every line of a function rewritten under its old name",
			change:   domain.LineChanges{Status: domain.ChangeModified, Hunks: []domain.LineHunk{{OldStart: 5, OldLines: 3, NewStart: 5, NewLines: 4}}},
			previous: []fakeSymbol{{name: "run", kind: symbolKindFunction, start: 4, end: 6}},
			want:     domain.FlowModified,
		},
		{
			name:   "added lines that stop one line before the end",
			change: domain.LineChanges{Status: domain.ChangeModified, Hunks: []domain.LineHunk{{OldStart: 4, NewStart: 5, NewLines: 3}}},
			want:   domain.FlowModified,
		},
		{
			name: "added lines around an existing line",
			change: domain.LineChanges{Status: domain.ChangeModified, Hunks: []domain.LineHunk{
				{OldStart: 4, NewStart: 5, NewLines: 2},
				{OldStart: 5, NewStart: 8, NewLines: 1},
			}},
			want: domain.FlowModified,
		},
		{
			name:   "one changed line",
			change: domain.LineChanges{Status: domain.ChangeModified, Hunks: []domain.LineHunk{{OldStart: 6, OldLines: 1, NewStart: 6, NewLines: 1}}},
			want:   domain.FlowModified,
		},
		{
			name:   "a staged new file",
			change: domain.LineChanges{Status: domain.ChangeAdded, Hunks: []domain.LineHunk{{NewStart: 1, NewLines: 10}}},
			want:   domain.FlowAdded,
		},
		{
			name:   "an untracked file",
			change: domain.WholeFileAdded("a.ts"),
			want:   domain.FlowAdded,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			fixture := newFlowFixture(t)
			fixture.tsls.symbols["a.ts"] = []fakeSymbol{{name: "run", kind: symbolKindFunction, start: 4, end: 7}}
			fixture.tsls.symbols[".oversee-previous.a.ts"] = test.previous
			change := test.change
			change.Path = "a.ts"
			fixture.change(change)
			fixture.git.contents["old:a.ts"] = "old a.ts"

			graph := fixture.flow(t, uncommitted)

			expectServers(t, graph, tslsReady)
			current := slices.DeleteFunc(nodesOf(graph), func(node string) bool {
				return strings.HasPrefix(node, "a.ts#removed")
			})
			expectStrings(t, "nodes", current, []string{fmt.Sprintf("a.ts#5 run function %s 5-8", test.want)})
		})
	}
}
