package domain

import (
	"fmt"
	"maps"
	"slices"
	"testing"
)

func TestUnitsOf(t *testing.T) {
	cases := []struct {
		name    string
		symbols []CodeSymbol
		want    []FlowUnit
	}{
		{
			name: "outermost callables keep their nested callables inside",
			symbols: []CodeSymbol{
				symbolOf(SymbolCallable, "render", LineSpan{1, 10}, symbolOf(SymbolCallable, "onClick", LineSpan{3, 5})),
				symbolOf(SymbolCallable, "helper", LineSpan{12, 14}),
			},
			want: []FlowUnit{
				unitOf("render", false, LineSpan{1, 10}),
				unitOf("helper", false, LineSpan{12, 14}),
			},
		},
		{
			name: "container members are qualified methods",
			symbols: []CodeSymbol{
				classOf("Service", LineSpan{1, 30},
					symbolOf(SymbolCallable, "start", LineSpan{2, 10}),
					symbolOf(SymbolValue, "handlers", LineSpan{12, 16}),
					symbolOf(SymbolValue, "count", LineSpan{18, 18}),
					symbolOf(SymbolOther, "Mode", LineSpan{20, 20}),
				),
			},
			want: []FlowUnit{
				unitOf("Service.start", true, LineSpan{2, 10}),
				{Name: "Service.handlers", Method: true, Value: true, Span: LineSpan{12, 16}, NameAt: SymbolPosition{Line: 12, Character: 6}},
			},
		},
		{
			name: "nested containers join their names",
			symbols: []CodeSymbol{
				classOf("Outer", LineSpan{1, 20},
					classOf("Inner", LineSpan{2, 19},
						symbolOf(SymbolCallable, "run", LineSpan{3, 8}),
					),
				),
			},
			want: []FlowUnit{
				unitOf("Outer.Inner.run", true, LineSpan{3, 8}),
			},
		},
		{
			name: "multi line values are units and one line values are not",
			symbols: []CodeSymbol{
				symbolOf(SymbolValue, "config", LineSpan{1, 5}),
				symbolOf(SymbolValue, "limit", LineSpan{7, 7}),
			},
			want: []FlowUnit{
				{Name: "config", Value: true, Span: LineSpan{1, 5}, NameAt: SymbolPosition{Line: 1, Character: 6}},
			},
		},
		{
			name: "multi line values keep their nested callables inside",
			symbols: []CodeSymbol{
				symbolOf(SymbolValue, "handler", LineSpan{1, 9}, symbolOf(SymbolCallable, "inner", LineSpan{2, 4})),
			},
			want: []FlowUnit{
				{Name: "handler", Value: true, Span: LineSpan{1, 9}, NameAt: SymbolPosition{Line: 1, Character: 6}},
			},
		},
		{
			name: "callables keep the method flag of the server",
			symbols: []CodeSymbol{
				{Name: "(*Repository).Tree", Kind: SymbolCallable, Method: true, Span: LineSpan{4, 12}, NameAt: SymbolPosition{Line: 4, Character: 20}},
			},
			want: []FlowUnit{
				{Name: "(*Repository).Tree", Method: true, Span: LineSpan{4, 12}, NameAt: SymbolPosition{Line: 4, Character: 20}},
			},
		},
		{
			name: "units keep the position of their name",
			symbols: []CodeSymbol{
				{Name: "handler", Kind: SymbolCallable, Span: LineSpan{10, 20}, NameAt: SymbolPosition{Line: 12, Character: 9}},
			},
			want: []FlowUnit{
				{Name: "handler", Span: LineSpan{10, 20}, NameAt: SymbolPosition{Line: 12, Character: 9}},
			},
		},
		{
			name: "other symbols hide their children",
			symbols: []CodeSymbol{
				symbolOf(SymbolOther, "Namespace", LineSpan{1, 10}, symbolOf(SymbolCallable, "inner", LineSpan{2, 4})),
			},
			want: nil,
		},
		{
			name:    "no symbols",
			symbols: nil,
			want:    nil,
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := UnitsOf(c.symbols); !slices.Equal(got, c.want) {
				t.Errorf("UnitsOf\n got: %+v\nwant: %+v", got, c.want)
			}
		})
	}
}

func TestLineChangesTouchedUnits(t *testing.T) {
	units := []FlowUnit{
		unitOf("first", false, LineSpan{1, 5}),
		unitOf("second", false, LineSpan{7, 9}),
		unitOf("third", false, LineSpan{11, 20}),
	}
	cases := []struct {
		name  string
		hunks []LineHunk
		side  FileSide
		want  []string
	}{
		{name: "new side", hunks: []LineHunk{hunkOf(20, 2, 8, 1)}, side: FileSideNew, want: []string{"second"}},
		{name: "old side", hunks: []LineHunk{hunkOf(20, 2, 8, 1)}, side: FileSideOld, want: []string{"third"}},
		{name: "several units in unit order", hunks: []LineHunk{hunkOf(15, 1, 15, 1), hunkOf(2, 1, 2, 1)}, side: FileSideNew, want: []string{"first", "third"}},
		{name: "deletion between units", hunks: []LineHunk{hunkOf(6, 1, 5, 0)}, side: FileSideNew, want: nil},
		{name: "no hunks", hunks: nil, side: FileSideNew, want: nil},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			changes := LineChanges{Path: "app.ts", Status: ChangeModified, Hunks: c.hunks}
			if got := unitNames(changes.TouchedUnits(c.side, units)); !slices.Equal(got, c.want) {
				t.Errorf("TouchedUnits(%s) = %v, want %v", c.side, got, c.want)
			}
		})
	}
}

func TestLineChangesRemovedUnits(t *testing.T) {
	oldUnits := []FlowUnit{
		unitOf("kept", false, LineSpan{1, 4}),
		unitOf("gone", false, LineSpan{6, 9}),
		unitOf("untouched", false, LineSpan{11, 14}),
		unitOf("renamedFrom", false, LineSpan{16, 18}),
	}
	newUnits := []FlowUnit{
		unitOf("kept", false, LineSpan{1, 3}),
		unitOf("renamedTo", false, LineSpan{10, 12}),
		unitOf("added", false, LineSpan{14, 20}),
	}
	changes := LineChanges{
		Path:   "app.ts",
		Status: ChangeModified,
		Hunks:  []LineHunk{hunkOf(3, 1, 2, 0), hunkOf(6, 4, 4, 0), hunkOf(16, 1, 10, 1)},
	}

	got := unitNames(changes.RemovedUnits(oldUnits, newUnits))

	if want := []string{"gone", "renamedFrom"}; !slices.Equal(got, want) {
		t.Errorf("RemovedUnits = %v, want %v", got, want)
	}
}

func TestFlowUnitKind(t *testing.T) {
	cases := []struct {
		name   string
		method bool
		path   string
		want   FlowKind
	}{
		{name: "useSession", path: "src/session.ts", want: FlowHook},
		{name: "useSession", path: "src/session.tsx", want: FlowHook},
		{name: "useSession", path: "src/session.js", want: FlowHook},
		{name: "useSession", path: "src/session.jsx", want: FlowHook},
		{name: "useSession", path: "src/session.mts", want: FlowHook},
		{name: "useSession", path: "src/session.mjs", want: FlowHook},
		{name: "Store.useValue", method: true, path: "src/store.ts", want: FlowHook},
		{name: "useSession", path: "internal/session.go", want: FlowFunction},
		{name: "useless", path: "src/util.ts", want: FlowFunction},
		{name: "use", path: "src/util.ts", want: FlowFunction},
		{name: "Button", path: "src/button.tsx", want: FlowComponent},
		{name: "Button", path: "src/button.jsx", want: FlowComponent},
		{name: "Button", path: "src/BUTTON.TSX", want: FlowComponent},
		{name: "Überblick", path: "src/overview.tsx", want: FlowComponent},
		{name: "Button", path: "src/button.ts", want: FlowFunction},
		{name: "button", path: "src/button.tsx", want: FlowFunction},
		{name: "_Button", path: "src/button.tsx", want: FlowFunction},
		{name: "Form.Field", method: true, path: "src/form.tsx", want: FlowMethod},
		{name: "Widget.render", method: true, path: "src/widget.tsx", want: FlowMethod},
		{name: "Repository.Tree", method: true, path: "internal/git/repository.go", want: FlowMethod},
		{name: "Run", path: "internal/app/app.go", want: FlowFunction},
	}
	for _, c := range cases {
		t.Run(fmt.Sprintf("%s in %s", c.name, c.path), func(t *testing.T) {
			unit := FlowUnit{Name: c.name, Method: c.method}
			if got := unit.Kind(c.path); got != c.want {
				t.Errorf("Kind = %s, want %s", got, c.want)
			}
		})
	}
}

func TestFlowNodeIDs(t *testing.T) {
	live := FlowNodeID("src/app.ts", 12)
	removed := RemovedFlowNodeID("src/app.ts", 12)
	if live != "src/app.ts#12" {
		t.Errorf("FlowNodeID = %q, want %q", live, "src/app.ts#12")
	}
	if removed != "src/app.ts#removed-12" {
		t.Errorf("RemovedFlowNodeID = %q, want %q", removed, "src/app.ts#removed-12")
	}
}

func TestFlowBuilderAddUnit(t *testing.T) {
	cases := []struct {
		name   string
		path   string
		unit   FlowUnit
		change FlowChange
		want   FlowNode
	}{
		{
			name:   "live node is keyed by the line of its name",
			path:   "src/button.tsx",
			unit:   FlowUnit{Name: "Button", Span: LineSpan{3, 12}, NameAt: SymbolPosition{Line: 4, Character: 16}},
			change: FlowModified,
			want:   FlowNode{ID: "src/button.tsx#4", Name: "Button", Kind: FlowComponent, Path: "src/button.tsx", Line: 4, EndLine: 12, Change: FlowModified},
		},
		{
			name:   "removed node has its own id",
			path:   "src/app.ts",
			unit:   FlowUnit{Name: "Legacy.run", Method: true, Span: LineSpan{5, 9}, NameAt: SymbolPosition{Line: 5, Character: 2}},
			change: FlowRemoved,
			want:   FlowNode{ID: "src/app.ts#removed-5", Name: "Legacy.run", Kind: FlowMethod, Path: "src/app.ts", Line: 5, EndLine: 9, Change: FlowRemoved},
		},
		{
			name:   "end line never comes before the name",
			path:   "main.go",
			unit:   FlowUnit{Name: "main", NameAt: SymbolPosition{Line: 7, Character: 5}},
			change: FlowAdded,
			want:   FlowNode{ID: "main.go#7", Name: "main", Kind: FlowFunction, Path: "main.go", Line: 7, EndLine: 7, Change: FlowAdded},
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			builder := NewFlowBuilder()
			if got := builder.AddUnit(c.path, c.unit, c.change); got != c.want {
				t.Errorf("AddUnit\n got: %+v\nwant: %+v", got, c.want)
			}
			if !builder.Has(c.want.ID) {
				t.Errorf("Has(%q) = false after AddUnit", c.want.ID)
			}
		})
	}
}

func TestFlowBuilderNodeAt(t *testing.T) {
	builder := NewFlowBuilder()
	live := builder.AddUnit("app.ts", flowUnitAt("render", 4, 10), FlowAdded)
	removedOnTheSameLine := builder.AddUnit("app.ts", flowUnitAt("legacyRender", 4, 8), FlowRemoved)
	removed := builder.AddUnit("app.ts", flowUnitAt("legacy", 12, 20), FlowRemoved)

	if node, found := builder.NodeAt("app.ts", 4); !found || node != live {
		t.Errorf("NodeAt(app.ts, 4) = %+v, %t, want %+v", node, found, live)
	}
	for _, line := range []int{5, 12} {
		if node, found := builder.NodeAt("app.ts", line); found {
			t.Errorf("NodeAt(app.ts, %d) = %+v, want no node", line, node)
		}
	}
	if node, found := builder.NodeAt("other.ts", 4); found {
		t.Errorf("NodeAt(other.ts, 4) = %+v, want no node", node)
	}
	for _, node := range []FlowNode{removedOnTheSameLine, removed} {
		if !builder.Has(node.ID) {
			t.Errorf("Has(%q) = false for a removed node", node.ID)
		}
	}
	if live.ID == removedOnTheSameLine.ID {
		t.Errorf("live and removed nodes on line 4 share the id %q", live.ID)
	}
}

func TestFlowBuilderRemove(t *testing.T) {
	builder := NewFlowBuilder()
	caller := builder.AddUnit("app.ts", flowUnitAt("caller", 1, 5), FlowModified)
	callee := builder.AddUnit("app.ts", flowUnitAt("callee", 7, 9), FlowModified)

	builder.Remove(callee.ID)
	builder.Remove("missing.ts#1")
	builder.AddEdge(FlowEdge{From: caller.ID, To: callee.ID, Line: 3, Via: FlowViaCall})

	if builder.Has(callee.ID) {
		t.Errorf("Has(%q) = true after Remove", callee.ID)
	}
	if node, found := builder.NodeAt("app.ts", 7); found {
		t.Errorf("NodeAt(app.ts, 7) = %+v after Remove, want no node", node)
	}
	graph := builder.Graph()
	if want := []FlowNode{caller}; !slices.Equal(graph.Nodes, want) {
		t.Errorf("Nodes = %+v, want %+v", graph.Nodes, want)
	}
	if len(graph.Edges) != 0 {
		t.Errorf("Edges = %+v, want none to a removed node", graph.Edges)
	}
}

func TestFlowBuilderRelabel(t *testing.T) {
	builder := NewFlowBuilder()
	node := builder.AddUnit("app.ts", flowUnitAt("run", 5, 9), FlowAdded)

	builder.Relabel(node.ID, FlowModified)
	builder.Relabel("app.ts#20", FlowModified)

	if relabeled, found := builder.NodeAt("app.ts", 5); !found || relabeled.Change != FlowModified {
		t.Errorf("NodeAt(app.ts, 5) = %+v, %v, want the node labeled modified", relabeled, found)
	}
	if builder.Has("app.ts#20") {
		t.Error("Relabel created a node that was never added")
	}
}

func TestFlowBuilderAddEdge(t *testing.T) {
	first := FlowNodeID("a.ts", 1)
	second := FlowNodeID("a.ts", 10)
	unknown := FlowNodeID("x.ts", 1)
	cases := []struct {
		name  string
		edges []FlowEdge
		want  []FlowEdge
	}{
		{
			name:  "self edges are dropped",
			edges: []FlowEdge{{From: first, To: first, Line: 3, Via: FlowViaCall}},
			want:  nil,
		},
		{
			name: "edges to unknown nodes are dropped",
			edges: []FlowEdge{
				{From: first, To: unknown, Line: 2, Via: FlowViaCall},
				{From: unknown, To: first, Line: 2, Via: FlowViaCall},
			},
			want: nil,
		},
		{
			name: "an earlier call line replaces a later one",
			edges: []FlowEdge{
				{From: first, To: second, Line: 9, Via: FlowViaCall},
				{From: first, To: second, Line: 4, Via: FlowViaImplementation},
			},
			want: []FlowEdge{{From: first, To: second, Line: 4, Via: FlowViaImplementation}},
		},
		{
			name: "a later call line does not replace an earlier one",
			edges: []FlowEdge{
				{From: first, To: second, Line: 4, Via: FlowViaCall},
				{From: first, To: second, Line: 9, Via: FlowViaImplementation},
			},
			want: []FlowEdge{{From: first, To: second, Line: 4, Via: FlowViaCall}},
		},
		{
			name: "the first edge wins a tie",
			edges: []FlowEdge{
				{From: first, To: second, Line: 4, Via: FlowViaSignal, Label: "pressed"},
				{From: first, To: second, Line: 4, Via: FlowViaConnect, Label: "released"},
			},
			want: []FlowEdge{{From: first, To: second, Line: 4, Via: FlowViaSignal, Label: "pressed"}},
		},
		{
			name: "opposite directions are separate pairs",
			edges: []FlowEdge{
				{From: second, To: first, Line: 12, Via: FlowViaCall},
				{From: first, To: second, Line: 3, Via: FlowViaCall},
			},
			want: []FlowEdge{
				{From: first, To: second, Line: 3, Via: FlowViaCall},
				{From: second, To: first, Line: 12, Via: FlowViaCall},
			},
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			builder := NewFlowBuilder()
			builder.AddUnit("a.ts", flowUnitAt("first", 1, 5), FlowModified)
			builder.AddUnit("a.ts", flowUnitAt("second", 10, 15), FlowModified)
			for _, edge := range c.edges {
				builder.AddEdge(edge)
			}
			if got := builder.Graph().Edges; !slices.Equal(got, c.want) {
				t.Errorf("Edges\n got: %+v\nwant: %+v", got, c.want)
			}
		})
	}
}

func TestFlowBuilderAddOriginSkipsDuplicates(t *testing.T) {
	builder := NewFlowBuilder()
	node := builder.AddUnit("app.ts", flowUnitAt("serve", 3, 9), FlowModified)
	main := FlowOrigin{Name: "main", Path: "cmd/main.go", Line: 8}
	setup := FlowOrigin{Name: "init", Path: "cmd/main.go", Line: 3}

	builder.AddOrigin(node.ID, main)
	builder.AddOrigin(node.ID, setup)
	builder.AddOrigin(node.ID, main)

	if got, want := builder.Graph().Origins[node.ID], []FlowOrigin{setup, main}; !slices.Equal(got, want) {
		t.Errorf("Origins = %+v, want %+v", got, want)
	}
}

func TestFlowBuilderAddServerKeepsTheWorstStatus(t *testing.T) {
	statusesFromBestToWorst := []ServerStatus{ServerReady, ServerUnsupported, ServerNeedsCheckout, ServerNotInstalled, ServerStarting, ServerIndexing, ServerFailed}
	for worseIndex := range len(statusesFromBestToWorst) {
		for betterIndex := range worseIndex {
			better := FlowServer{Server: "gopls", Status: statusesFromBestToWorst[betterIndex], Error: "better"}
			worse := FlowServer{Server: "gopls", Status: statusesFromBestToWorst[worseIndex], Error: "worse"}
			for _, order := range [][]FlowServer{{better, worse}, {worse, better}} {
				t.Run(fmt.Sprintf("%s then %s", order[0].Status, order[1].Status), func(t *testing.T) {
					builder := NewFlowBuilder()
					for _, server := range order {
						builder.AddServer(server)
					}
					if got := builder.Graph().Servers; !slices.Equal(got, []FlowServer{worse}) {
						t.Errorf("Servers = %+v, want %+v", got, []FlowServer{worse})
					}
				})
			}
		}
	}
}

func TestFlowBuilderAddServerKeepsTheFirstEntryOfATie(t *testing.T) {
	builder := NewFlowBuilder()
	builder.AddServer(FlowServer{Server: "gopls", Status: ServerFailed, Error: "first"})
	builder.AddServer(FlowServer{Server: "gopls", Status: ServerFailed, Error: "second"})

	want := []FlowServer{{Server: "gopls", Status: ServerFailed, Error: "first"}}
	if got := builder.Graph().Servers; !slices.Equal(got, want) {
		t.Errorf("Servers = %+v, want %+v", got, want)
	}
}

func TestFlowBuilderAddServerKeepsOneEntryPerServerInFirstSeenOrder(t *testing.T) {
	builder := NewFlowBuilder()
	builder.AddServer(FlowServer{Server: "typescript-language-server", Status: ServerReady})
	builder.AddServer(FlowServer{Server: "gopls", Status: ServerIndexing})
	builder.AddServer(FlowServer{Server: "typescript-language-server", Status: ServerFailed, Error: "crashed"})

	want := []FlowServer{
		{Server: "typescript-language-server", Status: ServerFailed, Error: "crashed"},
		{Server: "gopls", Status: ServerIndexing},
	}
	if got := builder.Graph().Servers; !slices.Equal(got, want) {
		t.Errorf("Servers = %+v, want %+v", got, want)
	}
}

func TestFlowBuilderInclude(t *testing.T) {
	builder := NewFlowBuilder()
	local := builder.AddUnit("a.ts", flowUnitAt("local", 1, 5), FlowModified)
	boot := FlowOrigin{Name: "boot", Path: "main.ts", Line: 2}
	builder.AddOrigin(local.ID, boot)
	builder.AddServer(FlowServer{Server: "typescript-language-server", Status: ServerReady})

	remote := FlowNode{ID: FlowNodeID("b.go", 3), Name: "Remote", Kind: FlowFunction, Path: "b.go", Line: 3, EndLine: 9, Change: FlowAdded}
	helper := FlowNode{ID: FlowNodeID("b.go", 20), Name: "helper", Kind: FlowFunction, Path: "b.go", Line: 20, EndLine: 24, Change: FlowModified}
	gone := FlowNode{ID: RemovedFlowNodeID("b.go", 12), Name: "Gone", Kind: FlowFunction, Path: "b.go", Line: 12, EndLine: 14, Change: FlowRemoved}
	start := FlowOrigin{Name: "main", Path: "main.go", Line: 4}
	setup := FlowOrigin{Name: "init", Path: "main.ts", Line: 1}
	builder.Include(FlowGraph{
		Servers: []FlowServer{
			{Server: "typescript-language-server", Status: ServerIndexing},
			{Server: "gopls", Status: ServerReady},
		},
		Nodes: []FlowNode{remote, helper, gone},
		Edges: []FlowEdge{
			{From: remote.ID, To: local.ID, Line: 5, Via: FlowViaCall},
			{From: remote.ID, To: helper.ID, Line: 6, Via: FlowViaCall},
			{From: remote.ID, To: FlowNodeID("c.ts", 1), Line: 7, Via: FlowViaCall},
		},
		Origins: map[string][]FlowOrigin{
			remote.ID: {start},
			local.ID:  {boot, setup},
		},
	})
	graph := builder.Graph()

	if want := []FlowNode{local, remote, gone, helper}; !slices.Equal(graph.Nodes, want) {
		t.Errorf("Nodes\n got: %+v\nwant: %+v", graph.Nodes, want)
	}
	wantEdges := []FlowEdge{
		{From: remote.ID, To: local.ID, Line: 5, Via: FlowViaCall},
		{From: remote.ID, To: helper.ID, Line: 6, Via: FlowViaCall},
	}
	if !slices.Equal(graph.Edges, wantEdges) {
		t.Errorf("Edges\n got: %+v\nwant: %+v", graph.Edges, wantEdges)
	}
	wantOrigins := map[string][]FlowOrigin{local.ID: {setup, boot}, remote.ID: {start}}
	if !maps.EqualFunc(graph.Origins, wantOrigins, slices.Equal[[]FlowOrigin]) {
		t.Errorf("Origins = %+v, want %+v", graph.Origins, wantOrigins)
	}
	wantServers := []FlowServer{
		{Server: "typescript-language-server", Status: ServerIndexing},
		{Server: "gopls", Status: ServerReady},
	}
	if !slices.Equal(graph.Servers, wantServers) {
		t.Errorf("Servers = %+v, want %+v", graph.Servers, wantServers)
	}
	if node, found := builder.NodeAt("b.go", 3); !found || node != remote {
		t.Errorf("NodeAt(b.go, 3) = %+v, %t, want %+v", node, found, remote)
	}
	if node, found := builder.NodeAt("b.go", 12); found {
		t.Errorf("NodeAt(b.go, 12) = %+v, want no node for a removed one", node)
	}
}

func TestFlowBuilderEntryPoints(t *testing.T) {
	builder := NewFlowBuilder()
	caller := builder.AddUnit("b.ts", flowUnitAt("caller", 1, 5), FlowModified)
	late := builder.AddUnit("a.ts", flowUnitAt("late", 9, 12), FlowAdded)
	callee := builder.AddUnit("a.ts", flowUnitAt("callee", 2, 4), FlowModified)
	recursive := builder.AddUnit("a.ts", flowUnitAt("recursive", 1, 1), FlowModified)
	builder.AddUnit("a.ts", flowUnitAt("legacy", 5, 7), FlowRemoved)
	builder.AddEdge(FlowEdge{From: caller.ID, To: callee.ID, Line: 3, Via: FlowViaCall})
	builder.AddEdge(FlowEdge{From: late.ID, To: callee.ID, Line: 10, Via: FlowViaCall})
	builder.AddEdge(FlowEdge{From: recursive.ID, To: recursive.ID, Line: 1, Via: FlowViaCall})

	if got, want := builder.EntryPoints(), []FlowNode{recursive, late, caller}; !slices.Equal(got, want) {
		t.Errorf("EntryPoints\n got: %+v\nwant: %+v", got, want)
	}
}

func TestFlowBuilderEntryPointsOfAnEmptyBuilder(t *testing.T) {
	if got := NewFlowBuilder().EntryPoints(); len(got) != 0 {
		t.Errorf("EntryPoints = %+v, want none", got)
	}
}

func TestFlowBuilderGraph(t *testing.T) {
	builder := NewFlowBuilder()
	second := builder.AddUnit("b.ts", flowUnitAt("second", 4, 8), FlowModified)
	first := builder.AddUnit("a.ts", flowUnitAt("first", 10, 12), FlowModified)
	third := builder.AddUnit("b.ts", flowUnitAt("third", 1, 2), FlowAdded)
	dropped := builder.AddUnit("c.ts", flowUnitAt("dropped", 1, 2), FlowModified)
	builder.AddEdge(FlowEdge{From: second.ID, To: third.ID, Line: 5, Via: FlowViaCall})
	builder.AddEdge(FlowEdge{From: first.ID, To: third.ID, Line: 11, Via: FlowViaCall})
	builder.AddEdge(FlowEdge{From: second.ID, To: first.ID, Line: 5, Via: FlowViaCall})
	builder.AddEdge(FlowEdge{From: second.ID, To: third.ID, Line: 7, Via: FlowViaImplementation})
	origin := FlowOrigin{Name: "main", Path: "main.ts", Line: 1}
	builder.AddOrigin(first.ID, origin)
	builder.AddOrigin(dropped.ID, origin)
	builder.AddOrigin(FlowNodeID("unknown.ts", 1), origin)
	builder.Remove(dropped.ID)

	graph := builder.Graph()

	if want := []FlowNode{first, third, second}; !slices.Equal(graph.Nodes, want) {
		t.Errorf("Nodes sorted by path and line\n got: %+v\nwant: %+v", graph.Nodes, want)
	}
	wantEdges := []FlowEdge{
		{From: first.ID, To: third.ID, Line: 11, Via: FlowViaCall},
		{From: second.ID, To: first.ID, Line: 5, Via: FlowViaCall},
		{From: second.ID, To: third.ID, Line: 5, Via: FlowViaCall},
	}
	if !slices.Equal(graph.Edges, wantEdges) {
		t.Errorf("Edges sorted by caller, line and callee\n got: %+v\nwant: %+v", graph.Edges, wantEdges)
	}
	wantOrigins := map[string][]FlowOrigin{first.ID: {origin}}
	if !maps.EqualFunc(graph.Origins, wantOrigins, slices.Equal[[]FlowOrigin]) {
		t.Errorf("Origins = %+v, want only the origins of nodes in the graph %+v", graph.Origins, wantOrigins)
	}
}

func symbolOf(kind SymbolKind, name string, span LineSpan, children ...CodeSymbol) CodeSymbol {
	return CodeSymbol{Name: name, Kind: kind, Span: span, NameAt: SymbolPosition{Line: span.Start, Character: 6}, Children: children}
}

func classOf(name string, span LineSpan, children ...CodeSymbol) CodeSymbol {
	symbol := symbolOf(SymbolContainer, name, span, children...)
	symbol.ClassLike = true
	return symbol
}

func unitOf(name string, method bool, span LineSpan) FlowUnit {
	return FlowUnit{Name: name, Method: method, Span: span, NameAt: SymbolPosition{Line: span.Start, Character: 6}}
}

func flowUnitAt(name string, nameLine, endLine int) FlowUnit {
	return FlowUnit{Name: name, Span: LineSpan{nameLine, endLine}, NameAt: SymbolPosition{Line: nameLine, Character: 9}}
}

func unitNames(units []FlowUnit) []string {
	var names []string
	for _, unit := range units {
		names = append(names, unit.Name)
	}
	return names
}

func TestLineChangesRewrittenUnits(t *testing.T) {
	changes := LineChanges{Status: ChangeModified, Hunks: []LineHunk{hunkOf(5, 3, 5, 6), hunkOf(19, 0, 20, 4)}}
	newUnits := []FlowUnit{
		flowUnitAt("run", 5, 8),
		flowUnitAt("partly", 9, 12),
		flowUnitAt("fresh", 20, 23),
		flowUnitAt("untouched", 30, 35),
	}
	oldUnits := []FlowUnit{
		flowUnitAt("run", 5, 7),
		flowUnitAt("partly", 8, 11),
		flowUnitAt("untouched", 27, 32),
		flowUnitAt("legacy", 14, 16),
	}

	rewritten := changes.RewrittenUnits(oldUnits, newUnits)

	if names := unitNames(rewritten); !slices.Equal(names, []string{"run"}) {
		t.Errorf("RewrittenUnits = %v, want only the unit that is fully new but existed before", names)
	}
	if rewritten := changes.RewrittenUnits(nil, newUnits); len(rewritten) != 0 {
		t.Errorf("RewrittenUnits without old units = %v, want none", unitNames(rewritten))
	}
}

func TestLineChangesChangeOf(t *testing.T) {
	unit := LineSpan{5, 10}
	line := LineSpan{7, 7}
	cases := []struct {
		name   string
		status ChangeStatus
		hunks  []LineHunk
		span   LineSpan
		want   FlowChange
	}{
		{name: "pure addition from the first to the last line", status: ChangeModified, hunks: []LineHunk{hunkOf(4, 0, 5, 6)}, span: unit, want: FlowAdded},
		{name: "pure addition around the unit", status: ChangeModified, hunks: []LineHunk{hunkOf(2, 0, 3, 10)}, span: unit, want: FlowAdded},
		{name: "pure addition from the second line", status: ChangeModified, hunks: []LineHunk{hunkOf(5, 0, 6, 5)}, span: unit, want: FlowModified},
		{name: "pure addition up to the line before the last", status: ChangeModified, hunks: []LineHunk{hunkOf(4, 0, 5, 5)}, span: unit, want: FlowModified},
		{name: "pure addition inside the unit", status: ChangeModified, hunks: []LineHunk{hunkOf(6, 0, 7, 2)}, span: unit, want: FlowModified},
		{name: "mixed hunk over the whole unit", status: ChangeModified, hunks: []LineHunk{hunkOf(5, 3, 5, 6)}, span: unit, want: FlowAdded},
		{name: "mixed hunk from the second line", status: ChangeModified, hunks: []LineHunk{hunkOf(6, 5, 6, 5)}, span: unit, want: FlowModified},
		{name: "mixed hunk up to the line before the last", status: ChangeModified, hunks: []LineHunk{hunkOf(5, 8, 5, 5)}, span: unit, want: FlowModified},
		{name: "mixed hunk inside the unit", status: ChangeModified, hunks: []LineHunk{hunkOf(7, 2, 7, 2)}, span: unit, want: FlowModified},
		{name: "deletion inside the unit", status: ChangeModified, hunks: []LineHunk{hunkOf(7, 2, 6, 0)}, span: unit, want: FlowModified},
		{name: "span across two additions", status: ChangeModified, hunks: []LineHunk{hunkOf(4, 0, 5, 3), hunkOf(5, 0, 9, 2)}, span: unit, want: FlowModified},
		{name: "span across an addition and a mixed hunk", status: ChangeModified, hunks: []LineHunk{hunkOf(4, 0, 5, 3), hunkOf(6, 2, 9, 2)}, span: unit, want: FlowModified},
		{name: "addition after an earlier hunk", status: ChangeModified, hunks: []LineHunk{hunkOf(0, 0, 1, 2), hunkOf(2, 0, 5, 6)}, span: unit, want: FlowAdded},
		{name: "addition before a later hunk", status: ChangeModified, hunks: []LineHunk{hunkOf(4, 0, 5, 6), hunkOf(6, 1, 12, 1)}, span: unit, want: FlowAdded},
		{name: "renamed file with an edit inside the unit", status: ChangeRenamed, hunks: []LineHunk{hunkOf(7, 1, 7, 1)}, span: unit, want: FlowModified},
		{name: "renamed file with the unit in added lines", status: ChangeRenamed, hunks: []LineHunk{hunkOf(4, 0, 5, 6)}, span: unit, want: FlowAdded},
		{name: "added file", status: ChangeAdded, hunks: []LineHunk{hunkOf(0, 0, 1, 20)}, span: unit, want: FlowAdded},
		{name: "untracked file without hunks", status: ChangeUntracked, hunks: nil, span: unit, want: FlowAdded},
		{name: "one line unit on an added line", status: ChangeModified, hunks: []LineHunk{hunkOf(6, 0, 7, 1)}, span: line, want: FlowAdded},
		{name: "one line unit on a replaced line", status: ChangeModified, hunks: []LineHunk{hunkOf(7, 1, 7, 1)}, span: line, want: FlowAdded},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			changes := LineChanges{Path: "app.ts", Status: c.status, Hunks: c.hunks}
			if !changes.Touches(FileSideNew, c.span) {
				t.Fatalf("hunks %+v do not touch %+v", c.hunks, c.span)
			}
			if got := changes.ChangeOf(unitOf("render", false, c.span)); got != c.want {
				t.Errorf("ChangeOf(%+v) with %s %+v = %s, want %s", c.span, c.status, c.hunks, got, c.want)
			}
		})
	}
}

func TestFlowUnitPlainValue(t *testing.T) {
	cases := []struct {
		name   string
		value  bool
		method bool
		path   string
		want   bool
	}{
		{name: "config", value: true, path: "src/config.ts", want: true},
		{name: "Settings.handlers", value: true, method: true, path: "src/settings.ts", want: true},
		{name: "Form.Field", value: true, method: true, path: "src/form.tsx", want: true},
		{name: "Button", value: true, path: "src/button.ts", want: true},
		{name: "useSession", value: true, path: "internal/session.go", want: true},
		{name: "useSession", value: true, path: "src/session.ts", want: false},
		{name: "Store.useValue", value: true, method: true, path: "src/store.ts", want: false},
		{name: "Button", value: true, path: "src/button.tsx", want: false},
		{name: "Overlay", value: true, path: "src/overlay.jsx", want: false},
		{name: "render", path: "src/render.ts", want: false},
		{name: "useSession", path: "src/session.ts", want: false},
		{name: "Button", path: "src/button.tsx", want: false},
		{name: "Repository.Tree", method: true, path: "internal/git/repository.go", want: false},
	}
	for _, c := range cases {
		t.Run(fmt.Sprintf("%s value %t in %s", c.name, c.value, c.path), func(t *testing.T) {
			unit := FlowUnit{Name: c.name, Method: c.method, Value: c.value}
			if got := unit.PlainValue(c.path); got != c.want {
				t.Errorf("PlainValue = %t, want %t", got, c.want)
			}
		})
	}
}

func TestFlowGraphRebuilding(t *testing.T) {
	caller := FlowNode{ID: FlowNodeID("a.ts", 1), Name: "caller", Kind: FlowFunction, Path: "a.ts", Line: 1, EndLine: 5, Change: FlowModified}
	callee := FlowNode{ID: FlowNodeID("b.go", 3), Name: "Callee", Kind: FlowFunction, Path: "b.go", Line: 3, EndLine: 9, Change: FlowAdded}
	edges := []FlowEdge{{From: caller.ID, To: callee.ID, Line: 3, Via: FlowViaCall}}
	origins := map[string][]FlowOrigin{caller.ID: {{Name: "main", Path: "main.ts", Line: 2}}}
	finished := FlowGraph{
		Servers: []FlowServer{
			{Server: "typescript-language-server", Status: ServerReady},
			{Server: "gopls", Status: ServerReady},
		},
		Nodes:   []FlowNode{caller, callee},
		Edges:   edges,
		Origins: origins,
	}
	reported := []FlowServer{
		{Server: "typescript-language-server", Status: ServerReady},
		{Server: "gopls", Status: ServerFailed, Error: "crashed"},
		{Server: "gdscript", Status: ServerStarting},
	}

	rebuilding := finished.Rebuilding(reported)

	wantServers := []FlowServer{
		{Server: "typescript-language-server", Status: ServerIndexing},
		{Server: "gopls", Status: ServerIndexing},
		{Server: "gdscript", Status: ServerIndexing},
	}
	if !slices.Equal(rebuilding.Servers, wantServers) {
		t.Errorf("Servers\n got: %+v\nwant: %+v", rebuilding.Servers, wantServers)
	}
	if rebuilding.Settled() {
		t.Error("Settled = true, want a rebuilding graph to keep retrying")
	}
	if !slices.Equal(rebuilding.Nodes, []FlowNode{caller, callee}) {
		t.Errorf("Nodes = %+v, want the finished nodes", rebuilding.Nodes)
	}
	if !slices.Equal(rebuilding.Edges, edges) {
		t.Errorf("Edges = %+v, want the finished edges", rebuilding.Edges)
	}
	if !maps.EqualFunc(rebuilding.Origins, origins, slices.Equal[[]FlowOrigin]) {
		t.Errorf("Origins = %+v, want the finished origins", rebuilding.Origins)
	}
	wantFinished := []FlowServer{
		{Server: "typescript-language-server", Status: ServerReady},
		{Server: "gopls", Status: ServerReady},
	}
	if !slices.Equal(finished.Servers, wantFinished) {
		t.Errorf("finished Servers = %+v after Rebuilding, want %+v", finished.Servers, wantFinished)
	}
}
