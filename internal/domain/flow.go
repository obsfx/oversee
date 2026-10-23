package domain

import (
	"cmp"
	"fmt"
	"maps"
	"path"
	"slices"
	"strings"
	"unicode"
)

type FlowKind string

const (
	FlowComponent FlowKind = "component"
	FlowHook      FlowKind = "hook"
	FlowFunction  FlowKind = "function"
	FlowMethod    FlowKind = "method"
	FlowCallback  FlowKind = "callback"
	FlowHandler   FlowKind = "handler"
)

type FlowChange string

const (
	FlowAdded    FlowChange = "added"
	FlowModified FlowChange = "modified"
	FlowRemoved  FlowChange = "removed"
)

type FlowVia string

const (
	FlowViaCall           FlowVia = "call"
	FlowViaImplementation FlowVia = "implementation"
	FlowViaSignal         FlowVia = "signal"
	FlowViaConnect        FlowVia = "connect"
)

type SymbolKind string

const (
	SymbolCallable  SymbolKind = "callable"
	SymbolValue     SymbolKind = "value"
	SymbolContainer SymbolKind = "container"
	SymbolOther     SymbolKind = "other"
)

type SymbolPosition struct {
	Line      int
	Character int
}

type CodeSymbol struct {
	Name        string
	Container   string
	Kind        SymbolKind
	Method      bool
	ClassLike   bool
	Span        LineSpan
	NameAt      SymbolPosition
	NameUnknown bool
	Children    []CodeSymbol
}

type FlowUnit struct {
	Name        string
	Method      bool
	Value       bool
	Span        LineSpan
	NameAt      SymbolPosition
	NameUnknown bool
	Role        FlowKind
}

type FlowNode struct {
	ID      string
	Name    string
	Kind    FlowKind
	Path    string
	Line    int
	EndLine int
	Change  FlowChange
}

type FlowEdge struct {
	From  string
	To    string
	Line  int
	Via   FlowVia
	Label string
}

type FlowOrigin struct {
	Name string
	Path string
	Line int
}

type FlowServer struct {
	Server string
	Status ServerStatus
	Error  string
}

type FlowGraph struct {
	Servers []FlowServer
	Nodes   []FlowNode
	Edges   []FlowEdge
	Origins map[string][]FlowOrigin
}

func FlowGraphWith(server string, status ServerStatus, err error) FlowGraph {
	return FlowGraph{Servers: []FlowServer{{Server: server, Status: status, Error: status.ErrorOf(err)}}}
}

func FlowServerUnavailable(server string, err error) FlowServer {
	if err != nil {
		return FlowServer{Server: server, Status: ServerFailed, Error: err.Error()}
	}
	return FlowServer{Server: server, Status: ServerNotInstalled}
}

func (g FlowGraph) Rebuilding(servers []FlowServer) FlowGraph {
	rebuilding := g
	rebuilding.Servers = make([]FlowServer, 0, len(servers))
	for _, server := range servers {
		rebuilding.Servers = append(rebuilding.Servers, FlowServer{Server: server.Server, Status: ServerIndexing})
	}
	return rebuilding
}

func (g FlowGraph) StatusOnly() FlowGraph {
	return FlowGraph{Servers: g.Servers}
}

func (g FlowGraph) WithServers(servers []FlowServer) FlowGraph {
	g.Servers = servers
	return g
}

func (g FlowGraph) Tracing() bool {
	return slices.ContainsFunc(g.Servers, func(server FlowServer) bool {
		return server.Status.Tracing()
	})
}

func (g FlowGraph) Settled() bool {
	return !slices.ContainsFunc(g.Servers, func(server FlowServer) bool {
		return server.Status.Transient()
	})
}

func (s CodeSymbol) isUnit() bool {
	if s.Kind == SymbolCallable {
		return true
	}
	return s.Kind == SymbolValue && s.Span.End > s.Span.Start
}

func (s CodeSymbol) unit(container string, inClass bool) FlowUnit {
	container = qualified(container, s.Container)
	return FlowUnit{Name: qualified(container, s.Name), Method: s.Method || inClass || s.Container != "", Value: s.Kind == SymbolValue, Span: s.Span, NameAt: s.NameAt, NameUnknown: s.NameUnknown}
}

func (s CodeSymbol) appendUnits(units []FlowUnit, container string, inClass bool) []FlowUnit {
	if s.isUnit() {
		return append(units, s.unit(container, inClass))
	}
	if s.Kind != SymbolContainer {
		return units
	}
	for _, child := range s.Children {
		units = child.appendUnits(units, qualified(container, s.Name), s.ClassLike)
	}
	return units
}

func qualified(container, name string) string {
	if container == "" {
		return name
	}
	if name == "" {
		return container
	}
	return container + "." + name
}

func UnitsOf(symbols []CodeSymbol) []FlowUnit {
	var units []FlowUnit
	for _, symbol := range symbols {
		units = symbol.appendUnits(units, "", false)
	}
	return units
}

func (c LineChanges) TouchedUnits(side FileSide, units []FlowUnit) []FlowUnit {
	var touched []FlowUnit
	for _, unit := range units {
		if c.Touches(side, unit.Span) {
			touched = append(touched, unit)
		}
	}
	return touched
}

func (c LineChanges) ChangeOf(unit FlowUnit) FlowChange {
	if c.adds(unit.Span) {
		return FlowAdded
	}
	return FlowModified
}

func (c LineChanges) RemovedUnits(oldUnits, newUnits []FlowUnit) []FlowUnit {
	kept := map[string]bool{}
	for _, unit := range newUnits {
		kept[unit.Name] = true
	}
	var removed []FlowUnit
	for _, unit := range oldUnits {
		if !kept[unit.Name] && c.Touches(FileSideOld, unit.Span) {
			removed = append(removed, unit)
		}
	}
	return removed
}

func (c LineChanges) RewrittenUnits(oldUnits, newUnits []FlowUnit) []FlowUnit {
	existed := map[string]bool{}
	for _, unit := range oldUnits {
		existed[unit.Name] = true
	}
	var rewritten []FlowUnit
	for _, unit := range c.TouchedUnits(FileSideNew, newUnits) {
		if existed[unit.Name] && c.ChangeOf(unit) == FlowAdded {
			rewritten = append(rewritten, unit)
		}
	}
	return rewritten
}

func (u FlowUnit) Kind(filePath string) FlowKind {
	if u.Role != "" {
		return u.Role
	}
	name := u.Name
	if _, last, found := strings.CutLast(name, "."); found {
		name = last
	}
	extension := strings.ToLower(path.Ext(filePath))
	script := extension == ".ts" || extension == ".tsx" || extension == ".js" || extension == ".jsx" || extension == ".mts" || extension == ".mjs"
	if script && isHookName(name) {
		return FlowHook
	}
	if (extension == ".tsx" || extension == ".jsx") && !u.Method && startsUpper(name) {
		return FlowComponent
	}
	if u.Method {
		return FlowMethod
	}
	return FlowFunction
}

func (u FlowUnit) PlainValue(filePath string) bool {
	if !u.Value {
		return false
	}
	kind := u.Kind(filePath)
	return kind != FlowHook && kind != FlowComponent
}

func isHookName(name string) bool {
	rest, found := strings.CutPrefix(name, "use")
	return found && rest != "" && startsUpper(rest)
}

func startsUpper(name string) bool {
	for _, character := range name {
		return unicode.IsUpper(character)
	}
	return false
}

func FlowNodeID(filePath string, line int) string {
	return fmt.Sprintf("%s#%d", filePath, line)
}

func RemovedFlowNodeID(filePath string, line int) string {
	return fmt.Sprintf("%s#removed-%d", filePath, line)
}

type flowPair struct {
	from string
	to   string
}

type FlowBuilder struct {
	nodes   map[string]FlowNode
	edges   map[flowPair]FlowEdge
	origins map[string][]FlowOrigin
	servers []FlowServer
}

func NewFlowBuilder() *FlowBuilder {
	return &FlowBuilder{
		nodes:   map[string]FlowNode{},
		edges:   map[flowPair]FlowEdge{},
		origins: map[string][]FlowOrigin{},
	}
}

func (b *FlowBuilder) AddUnit(filePath string, unit FlowUnit, change FlowChange) FlowNode {
	id := FlowNodeID(filePath, unit.NameAt.Line)
	if change == FlowRemoved {
		id = RemovedFlowNodeID(filePath, unit.NameAt.Line)
	}
	node := FlowNode{
		ID:      id,
		Name:    unit.Name,
		Kind:    unit.Kind(filePath),
		Path:    filePath,
		Line:    unit.NameAt.Line,
		EndLine: max(unit.Span.End, unit.NameAt.Line),
		Change:  change,
	}
	b.nodes[node.ID] = node
	return node
}

func (b *FlowBuilder) AddRemovals(file LineChanges, oldUnits, newUnits []FlowUnit, namePrefix string) {
	for _, unit := range file.RemovedUnits(oldUnits, newUnits) {
		unit.Name = namePrefix + unit.Name
		b.AddUnit(file.Path, unit, FlowRemoved)
	}
	for _, unit := range file.RewrittenUnits(oldUnits, newUnits) {
		b.Relabel(FlowNodeID(file.Path, unit.NameAt.Line), FlowModified)
	}
}

func (b *FlowBuilder) NodeAt(filePath string, nameLine int) (FlowNode, bool) {
	node, found := b.nodes[FlowNodeID(filePath, nameLine)]
	return node, found
}

func (b *FlowBuilder) Has(id string) bool {
	_, found := b.nodes[id]
	return found
}

func (b *FlowBuilder) Remove(id string) {
	delete(b.nodes, id)
}

func (b *FlowBuilder) Relabel(id string, change FlowChange) {
	node, found := b.nodes[id]
	if !found {
		return
	}
	node.Change = change
	b.nodes[id] = node
}

func (b *FlowBuilder) AddEdge(edge FlowEdge) {
	if edge.From == edge.To || !b.Has(edge.From) || !b.Has(edge.To) {
		return
	}
	pair := flowPair{from: edge.From, to: edge.To}
	existing, found := b.edges[pair]
	if found && existing.Line <= edge.Line {
		return
	}
	b.edges[pair] = edge
}

func (b *FlowBuilder) AddOrigin(id string, origin FlowOrigin) {
	if slices.Contains(b.origins[id], origin) {
		return
	}
	b.origins[id] = append(b.origins[id], origin)
}

func (b *FlowBuilder) AddServer(server FlowServer) {
	index := slices.IndexFunc(b.servers, func(existing FlowServer) bool {
		return existing.Server == server.Server
	})
	if index < 0 {
		b.servers = append(b.servers, server)
		return
	}
	if server.Status.rank() > b.servers[index].Status.rank() {
		b.servers[index] = server
	}
}

func (b *FlowBuilder) Include(graph FlowGraph) {
	for _, node := range graph.Nodes {
		b.nodes[node.ID] = node
	}
	for _, edge := range graph.Edges {
		b.AddEdge(edge)
	}
	for id, origins := range graph.Origins {
		for _, origin := range origins {
			b.AddOrigin(id, origin)
		}
	}
	for _, server := range graph.Servers {
		b.AddServer(server)
	}
}

func (b *FlowBuilder) Link(edges []FlowEdge) {
	for _, edge := range edges {
		b.AddEdge(edge)
		if _, linked := b.edges[flowPair{from: edge.From, to: edge.To}]; linked {
			delete(b.origins, edge.To)
		}
	}
}

func (b *FlowBuilder) EntryPoints() []FlowNode {
	called := map[string]bool{}
	for pair := range b.edges {
		called[pair.to] = true
	}
	var entries []FlowNode
	for _, node := range b.sortedNodes() {
		if !called[node.ID] && node.Change != FlowRemoved {
			entries = append(entries, node)
		}
	}
	return entries
}

func (b *FlowBuilder) Graph() FlowGraph {
	edges := slices.SortedFunc(maps.Values(b.edges), func(left, right FlowEdge) int {
		return cmp.Or(cmp.Compare(left.From, right.From), cmp.Compare(left.Line, right.Line), cmp.Compare(left.To, right.To))
	})
	origins := map[string][]FlowOrigin{}
	for id, list := range b.origins {
		if b.Has(id) {
			origins[id] = slices.SortedFunc(slices.Values(list), func(left, right FlowOrigin) int {
				return cmp.Or(cmp.Compare(left.Path, right.Path), cmp.Compare(left.Line, right.Line), cmp.Compare(left.Name, right.Name))
			})
		}
	}
	return FlowGraph{Servers: b.servers, Nodes: b.sortedNodes(), Edges: edges, Origins: origins}
}

func (b *FlowBuilder) sortedNodes() []FlowNode {
	return slices.SortedFunc(maps.Values(b.nodes), func(left, right FlowNode) int {
		return cmp.Or(cmp.Compare(left.Path, right.Path), cmp.Compare(left.Line, right.Line))
	})
}
