package service

import (
	"context"
	"maps"
	"sync/atomic"
	"time"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/langserver"
)

type flowGeneration struct {
	refs     uint64
	worktree uint64
}

type comparisonFlow struct {
	reporter *flowReporter
	current  *flowBuild
	queued   *flowBuild
	last     *flowBuild
	kept     keptResults
	waiters  int
	waitedAt time.Time
	idle     *time.Timer
}

type keptResults struct {
	generation flowGeneration
	groups     map[string]groupResult
	godot      *domain.FlowGraph
}

type groupResult struct {
	graph     domain.FlowGraph
	crossings []domain.FlowEdge
}

type flowBuild struct {
	generation flowGeneration
	cancel     context.CancelFunc
	superseded atomic.Bool
	started    bool
	tracker    *flowTracker
	grouped    chan struct{}
	versions   serverVersions
	pending    domain.FlowGraph
	done       chan struct{}
	graph      domain.FlowGraph
	err        error
}

type serverVersions map[string]string

func (v serverVersions) record(server string, installation langserver.Installation, found bool) {
	v[server] = ""
	if found {
		v[server] = installation.Version
	}
}

func (v serverVersions) differ(current serverVersions) bool {
	for server, version := range v {
		if now, known := current[server]; known && now != version {
			return true
		}
	}
	return false
}

func (f *comparisonFlow) newest() *flowBuild {
	if f.queued != nil {
		return f.queued
	}
	return f.current
}

func (f *comparisonFlow) abandon() {
	if f.queued != nil {
		f.queued.supersede()
		f.queued = nil
	}
	if f.current != nil && !f.current.finished() {
		f.current.supersede()
	}
}

func (f *comparisonFlow) interim(build *flowBuild) (domain.FlowGraph, bool) {
	pending, grouped := f.pendingFor(build)
	if f.last == nil {
		return pending, grouped
	}
	servers := f.last.graph.Servers
	if grouped {
		servers = pending.Servers
	}
	if len(servers) == 0 {
		return pending, grouped
	}
	return f.last.graph.Rebuilding(servers), true
}

func (f *comparisonFlow) shown(graph domain.FlowGraph) domain.FlowGraph {
	if !graph.Tracing() {
		return graph
	}
	if f.last == nil {
		return graph.StatusOnly()
	}
	return f.last.graph.WithServers(graph.Servers)
}

func (f *comparisonFlow) pendingFor(build *flowBuild) (domain.FlowGraph, bool) {
	if build.isGrouped() {
		return build.pending, true
	}
	if f.current != nil && f.current.isGrouped() {
		return f.current.pending, true
	}
	return domain.FlowGraph{}, false
}

func (k *keptResults) reset(generation flowGeneration) {
	if k.generation != generation {
		*k = keptResults{generation: generation}
	}
}

func (k keptResults) at(generation flowGeneration) keptResults {
	if k.generation != generation {
		return keptResults{generation: generation}
	}
	return keptResults{generation: generation, groups: maps.Clone(k.groups), godot: k.godot}
}

func (k *keptResults) keepGroup(generation flowGeneration, key string, result groupResult) {
	if k.generation != generation || !result.graph.Settled() {
		return
	}
	if k.groups == nil {
		k.groups = map[string]groupResult{}
	}
	k.groups[key] = result
}

func (k *keptResults) keepGodot(generation flowGeneration, graph domain.FlowGraph) {
	if k.generation == generation && graph.Settled() {
		k.godot = new(graph)
	}
}

func (k keptResults) split(groups []flowGroup) ([]groupResult, []flowGroup) {
	var kept []groupResult
	var runs []flowGroup
	for _, group := range groups {
		if result, found := k.groups[group.key()]; found {
			kept = append(kept, result)
			continue
		}
		runs = append(runs, group)
	}
	return kept, runs
}

func (b *flowBuild) serves(generation flowGeneration, installed serverVersions) bool {
	if b.superseded.Load() || b.generation != generation || b.installed().differ(installed) {
		return false
	}
	return !b.finished() || b.err == nil && b.graph.Settled()
}

func (b *flowBuild) installed() serverVersions {
	if !b.isGrouped() {
		return nil
	}
	return b.versions
}

func (b *flowBuild) group(pending domain.FlowGraph, versions serverVersions) {
	b.pending = pending
	b.versions = versions
	b.tracker.grouped(pending.Servers)
	close(b.grouped)
}

func (b *flowBuild) supersede() {
	b.superseded.Store(true)
	if b.started {
		b.cancel()
		return
	}
	close(b.done)
}

func (b *flowBuild) result() (domain.FlowGraph, error) {
	if b.superseded.Load() {
		return domain.FlowGraph{}, errSuperseded
	}
	return b.graph, b.err
}

func (b *flowBuild) isGrouped() bool {
	select {
	case <-b.grouped:
		return true
	default:
		return false
	}
}

func (b *flowBuild) finished() bool {
	select {
	case <-b.done:
		return true
	default:
		return false
	}
}
