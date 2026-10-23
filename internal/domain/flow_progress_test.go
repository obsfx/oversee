package domain

import (
	"slices"
	"testing"
)

func TestNewFlowProgress(t *testing.T) {
	comparison := Comparison{Source: UncommittedSource, Target: "main"}
	tests := []struct {
		name   string
		groups []FlowGroupProgress
		want   []FlowServerProgress
	}{
		{
			name: "no groups report no servers",
			want: []FlowServerProgress{},
		},
		{
			name:   "a starting group counts nothing",
			groups: []FlowGroupProgress{{Server: "tsls", Phase: FlowPhaseStarting}},
			want:   []FlowServerProgress{{Server: "tsls", Phase: FlowPhaseStarting}},
		},
		{
			name:   "a reading group counts files",
			groups: []FlowGroupProgress{{Server: "tsls", Phase: FlowPhaseReading, Files: FlowCount{Done: 1, Total: 3}}},
			want:   []FlowServerProgress{{Server: "tsls", Phase: FlowPhaseReading, Done: 1, Total: 3}},
		},
		{
			name: "a tracing group counts functions",
			groups: []FlowGroupProgress{
				{Server: "tsls", Phase: FlowPhaseTracing, Files: FlowCount{Done: 3, Total: 3}, Functions: FlowCount{Done: 2, Total: 5}},
			},
			want: []FlowServerProgress{{Server: "tsls", Phase: FlowPhaseTracing, Done: 2, Total: 5}},
		},
		{
			name: "a done group counts nothing",
			groups: []FlowGroupProgress{
				{Server: "tsls", Phase: FlowPhaseDone, Files: FlowCount{Done: 3, Total: 3}, Functions: FlowCount{Done: 5, Total: 5}},
			},
			want: []FlowServerProgress{{Server: "tsls", Phase: FlowPhaseDone}},
		},
		{
			name: "the least advanced group sets the phase and groups past it count their files as complete",
			groups: []FlowGroupProgress{
				{Server: "tsls", Phase: FlowPhaseTracing, Files: FlowCount{Done: 1, Total: 4}, Functions: FlowCount{Done: 1, Total: 9}},
				{Server: "tsls", Phase: FlowPhaseReading, Files: FlowCount{Done: 2, Total: 5}},
				{Server: "tsls", Phase: FlowPhaseDone, Files: FlowCount{Total: 2}, Functions: FlowCount{Total: 6}},
			},
			want: []FlowServerProgress{{Server: "tsls", Phase: FlowPhaseReading, Done: 8, Total: 11}},
		},
		{
			name: "a tracing server counts the functions of done groups as complete",
			groups: []FlowGroupProgress{
				{Server: "tsls", Phase: FlowPhaseDone, Files: FlowCount{Done: 2, Total: 2}, Functions: FlowCount{Done: 2, Total: 6}},
				{Server: "tsls", Phase: FlowPhaseTracing, Files: FlowCount{Done: 4, Total: 4}, Functions: FlowCount{Done: 1, Total: 3}},
			},
			want: []FlowServerProgress{{Server: "tsls", Phase: FlowPhaseTracing, Done: 7, Total: 9}},
		},
		{
			name: "a starting group holds the server at starting",
			groups: []FlowGroupProgress{
				{Server: "tsls", Phase: FlowPhaseTracing, Files: FlowCount{Done: 4, Total: 4}, Functions: FlowCount{Done: 1, Total: 3}},
				{Server: "tsls", Phase: FlowPhaseStarting},
			},
			want: []FlowServerProgress{{Server: "tsls", Phase: FlowPhaseStarting}},
		},
		{
			name: "servers are listed once each, sorted by id",
			groups: []FlowGroupProgress{
				{Server: "tsls", Phase: FlowPhaseReading, Files: FlowCount{Done: 1, Total: 2}},
				{Server: "gdscript", Phase: FlowPhaseStarting},
				{Server: "gopls", Phase: FlowPhaseDone},
				{Server: "tsls", Phase: FlowPhaseReading, Files: FlowCount{Done: 0, Total: 3}},
			},
			want: []FlowServerProgress{
				{Server: "gdscript", Phase: FlowPhaseStarting},
				{Server: "gopls", Phase: FlowPhaseDone},
				{Server: "tsls", Phase: FlowPhaseReading, Done: 1, Total: 5},
			},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			progress := NewFlowProgress(comparison, test.groups)

			if progress.Comparison != comparison {
				t.Errorf("comparison = %+v, want %+v", progress.Comparison, comparison)
			}
			if progress.Servers == nil || !slices.Equal(progress.Servers, test.want) {
				t.Errorf("servers\n got: %+v\nwant: %+v", progress.Servers, test.want)
			}
		})
	}
}

func TestFlowPhaseBefore(t *testing.T) {
	order := []FlowPhase{FlowPhaseStarting, FlowPhaseReading, FlowPhaseTracing, FlowPhaseDone}
	for index, phase := range order {
		for otherIndex, other := range order {
			want := index < otherIndex
			if got := phase.Before(other); got != want {
				t.Errorf("%s.Before(%s) = %v, want %v", phase, other, got, want)
			}
		}
	}
}
