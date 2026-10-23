package dto

import (
	"time"

	"github.com/obsfx/oversee/internal/domain"
)

const changeFlowProgressKind = "change-flow.progress"

type ChangeFlow struct {
	Servers []FlowServer            `json:"servers"`
	Nodes   []FlowNode              `json:"nodes"`
	Edges   []FlowEdge              `json:"edges"`
	Origins map[string][]FlowOrigin `json:"origins"`
}

type FlowServer struct {
	Server string `json:"server"`
	Status string `json:"status"`
	Error  string `json:"error"`
}

type FlowNode struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Kind    string `json:"kind"`
	Path    string `json:"path"`
	Line    int    `json:"line"`
	EndLine int    `json:"endLine"`
	Change  string `json:"change"`
}

type FlowEdge struct {
	From  string  `json:"from"`
	To    string  `json:"to"`
	Line  int     `json:"line"`
	Via   string  `json:"via"`
	Label *string `json:"label"`
}

type FlowOrigin struct {
	Name string  `json:"name"`
	Path *string `json:"path"`
	Line *int    `json:"line"`
}

func ChangeFlowOf(graph domain.FlowGraph) ChangeFlow {
	flow := ChangeFlow{
		Servers: make([]FlowServer, 0, len(graph.Servers)),
		Nodes:   make([]FlowNode, 0, len(graph.Nodes)),
		Edges:   make([]FlowEdge, 0, len(graph.Edges)),
		Origins: make(map[string][]FlowOrigin, len(graph.Origins)),
	}
	for _, server := range graph.Servers {
		flow.Servers = append(flow.Servers, FlowServer{Server: server.Server, Status: string(server.Status), Error: server.Error})
	}
	for _, node := range graph.Nodes {
		flow.Nodes = append(flow.Nodes, FlowNode{
			ID:      node.ID,
			Name:    node.Name,
			Kind:    string(node.Kind),
			Path:    node.Path,
			Line:    node.Line,
			EndLine: node.EndLine,
			Change:  string(node.Change),
		})
	}
	for _, edge := range graph.Edges {
		flow.Edges = append(flow.Edges, FlowEdge{
			From:  edge.From,
			To:    edge.To,
			Line:  edge.Line,
			Via:   string(edge.Via),
			Label: optionalString(edge.Label),
		})
	}
	for id, origins := range graph.Origins {
		list := make([]FlowOrigin, 0, len(origins))
		for _, origin := range origins {
			list = append(list, FlowOrigin{Name: origin.Name, Path: optionalString(origin.Path), Line: optionalLine(origin.Line)})
		}
		flow.Origins[id] = list
	}
	return flow
}

func optionalString(value string) *string {
	if value == "" {
		return nil
	}
	return new(value)
}

func optionalLine(line int) *int {
	if line <= 0 {
		return nil
	}
	return new(line)
}

type flowProgressPayload struct {
	Comparison Comparison           `json:"comparison"`
	Servers    []flowServerProgress `json:"servers"`
}

type flowServerProgress struct {
	Server string `json:"server"`
	Phase  string `json:"phase"`
	Done   int    `json:"done"`
	Total  int    `json:"total"`
}

func FlowProgressOf(progress domain.FlowProgress, at time.Time) (Envelope, error) {
	servers := make([]flowServerProgress, 0, len(progress.Servers))
	for _, server := range progress.Servers {
		servers = append(servers, flowServerProgress{Server: server.Server, Phase: string(server.Phase), Done: server.Done, Total: server.Total})
	}
	return signalOf(changeFlowProgressKind, flowProgressPayload{Comparison: ComparisonOf(progress.Comparison), Servers: servers}, at)
}
