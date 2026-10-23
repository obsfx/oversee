package dto_test

import (
	"encoding/json/v2"
	"testing"
	"time"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/transport/dto"
)

func TestChangeFlowOf(t *testing.T) {
	tests := []struct {
		name  string
		graph domain.FlowGraph
		want  string
	}{
		{
			name:  "empty graph encodes empty lists and an empty origins object",
			graph: domain.FlowGraph{},
			want:  `{"servers":[],"nodes":[],"edges":[],"origins":{}}`,
		},
		{
			name: "servers keep their status and error",
			graph: domain.FlowGraph{Servers: []domain.FlowServer{
				{Server: "gopls", Status: domain.ServerReady},
				{Server: "pyright", Status: domain.ServerFailed, Error: "exit status 1"},
			}},
			want: `{"servers":[{"server":"gopls","status":"ready","error":""},{"server":"pyright","status":"failed","error":"exit status 1"}],"nodes":[],"edges":[],"origins":{}}`,
		},
		{
			name: "nodes",
			graph: domain.FlowGraph{Nodes: []domain.FlowNode{
				{ID: "server.go#12", Name: "Server.Serve", Kind: domain.FlowMethod, Path: "server.go", Line: 12, EndLine: 30, Change: domain.FlowModified},
				{ID: "server.go#removed-40", Name: "legacy", Kind: domain.FlowFunction, Path: "server.go", Line: 40, EndLine: 44, Change: domain.FlowRemoved},
			}},
			want: `{"servers":[],"nodes":[{"id":"server.go#12","name":"Server.Serve","kind":"method","path":"server.go","line":12,"endLine":30,"change":"modified"},{"id":"server.go#removed-40","name":"legacy","kind":"function","path":"server.go","line":40,"endLine":44,"change":"removed"}],"edges":[],"origins":{}}`,
		},
		{
			name: "edges encode an empty label as null",
			graph: domain.FlowGraph{Edges: []domain.FlowEdge{
				{From: "server.go#12", To: "helper.go#3", Line: 15, Via: domain.FlowViaCall},
				{From: "server.go#12", To: "store.go#8", Line: 18, Via: domain.FlowViaImplementation},
				{From: "player.gd#4", To: "hud.gd#9", Line: 6, Via: domain.FlowViaSignal, Label: "health_changed"},
			}},
			want: `{"servers":[],"nodes":[],"edges":[{"from":"server.go#12","to":"helper.go#3","line":15,"via":"call","label":null},{"from":"server.go#12","to":"store.go#8","line":18,"via":"implementation","label":null},{"from":"player.gd#4","to":"hud.gd#9","line":6,"via":"signal","label":"health_changed"}],"origins":{}}`,
		},
		{
			name: "origins encode an empty path and a missing line as null",
			graph: domain.FlowGraph{Origins: map[string][]domain.FlowOrigin{
				"server.go#12": {
					{Name: "main", Path: "cmd/main.go", Line: 7},
					{Name: "init", Path: "", Line: 0},
					{Name: "negative line", Path: "cmd/tool.go", Line: -1},
				},
				"helper.go#3": {},
			}},
			want: `{"servers":[],"nodes":[],"edges":[],"origins":{"helper.go#3":[],"server.go#12":[{"name":"main","path":"cmd/main.go","line":7},{"name":"init","path":null,"line":null},{"name":"negative line","path":"cmd/tool.go","line":null}]}}`,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			encoded, err := json.Marshal(dto.ChangeFlowOf(test.graph), json.Deterministic(true), json.FormatNilSliceAsNull(true), json.FormatNilMapAsNull(true))
			if err != nil {
				t.Fatalf("encode change flow: %v", err)
			}
			if string(encoded) != test.want {
				t.Errorf("ChangeFlowOf() encodes\n%s\nwant\n%s", encoded, test.want)
			}
		})
	}
}

func TestFlowProgressOf(t *testing.T) {
	at := time.UnixMilli(1_760_000_000_123)
	tests := []struct {
		name     string
		progress domain.FlowProgress
		want     string
	}{
		{
			name:     "no servers encode an empty list",
			progress: domain.FlowProgress{Comparison: domain.Comparison{Source: domain.UncommittedSource, Target: "main"}},
			want:     `{"kind":"change-flow.progress","payload":{"comparison":{"source":":uncommitted","target":"main"},"servers":[]},"createdAt":1760000000123}`,
		},
		{
			name: "servers keep their order, phase and counts",
			progress: domain.FlowProgress{
				Comparison: domain.Comparison{Source: "feature/flow", Target: "main"},
				Servers: []domain.FlowServerProgress{
					{Server: "gdscript", Phase: domain.FlowPhaseStarting},
					{Server: "gopls", Phase: domain.FlowPhaseReading, Done: 1, Total: 4},
					{Server: "tsls", Phase: domain.FlowPhaseTracing, Done: 12, Total: 40},
					{Server: "zls", Phase: domain.FlowPhaseDone},
				},
			},
			want: `{"kind":"change-flow.progress","payload":{"comparison":{"source":"feature/flow","target":"main"},"servers":[` +
				`{"server":"gdscript","phase":"starting","done":0,"total":0},` +
				`{"server":"gopls","phase":"reading","done":1,"total":4},` +
				`{"server":"tsls","phase":"tracing","done":12,"total":40},` +
				`{"server":"zls","phase":"done","done":0,"total":0}]},"createdAt":1760000000123}`,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			envelope, err := dto.FlowProgressOf(test.progress, at)
			if err != nil {
				t.Fatalf("FlowProgressOf: %v", err)
			}
			if envelope.Replayable() {
				t.Errorf("envelope id = %d, want a signal that is never replayed", envelope.ID)
			}
			encoded, err := json.Marshal(envelope)
			if err != nil {
				t.Fatalf("encode envelope: %v", err)
			}
			if string(encoded) != test.want {
				t.Errorf("FlowProgressOf() encodes\n%s\nwant\n%s", encoded, test.want)
			}
		})
	}
}
