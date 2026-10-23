package domain

import (
	"maps"
	"slices"
)

type FlowPhase string

const (
	FlowPhaseStarting FlowPhase = "starting"
	FlowPhaseReading  FlowPhase = "reading"
	FlowPhaseTracing  FlowPhase = "tracing"
	FlowPhaseDone     FlowPhase = "done"
)

var flowPhaseRanks = map[FlowPhase]int{
	FlowPhaseStarting: 0,
	FlowPhaseReading:  1,
	FlowPhaseTracing:  2,
	FlowPhaseDone:     3,
}

func (p FlowPhase) Before(other FlowPhase) bool {
	return flowPhaseRanks[p] < flowPhaseRanks[other]
}

type FlowCount struct {
	Done  int
	Total int
}

type FlowGroupProgress struct {
	Server    string
	Phase     FlowPhase
	Files     FlowCount
	Functions FlowCount
}

func (g FlowGroupProgress) countIn(phase FlowPhase) FlowCount {
	var count FlowCount
	switch phase {
	case FlowPhaseReading:
		count = g.Files
	case FlowPhaseTracing:
		count = g.Functions
	default:
		return FlowCount{}
	}
	if phase.Before(g.Phase) {
		count.Done = count.Total
	}
	return count
}

type FlowServerProgress struct {
	Server string
	Phase  FlowPhase
	Done   int
	Total  int
}

type FlowProgress struct {
	Comparison Comparison
	Servers    []FlowServerProgress
}

func NewFlowProgress(comparison Comparison, groups []FlowGroupProgress) FlowProgress {
	byServer := map[string][]FlowGroupProgress{}
	for _, group := range groups {
		byServer[group.Server] = append(byServer[group.Server], group)
	}
	servers := make([]FlowServerProgress, 0, len(byServer))
	for _, server := range slices.Sorted(maps.Keys(byServer)) {
		servers = append(servers, flowServerProgressOf(server, byServer[server]))
	}
	return FlowProgress{Comparison: comparison, Servers: servers}
}

func flowServerProgressOf(server string, groups []FlowGroupProgress) FlowServerProgress {
	progress := FlowServerProgress{Server: server, Phase: FlowPhaseDone}
	for _, group := range groups {
		if group.Phase.Before(progress.Phase) {
			progress.Phase = group.Phase
		}
	}
	for _, group := range groups {
		count := group.countIn(progress.Phase)
		progress.Done += count.Done
		progress.Total += count.Total
	}
	return progress
}
