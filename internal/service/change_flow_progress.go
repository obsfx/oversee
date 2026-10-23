package service

import (
	"context"
	"maps"
	"slices"
	"sync"
	"sync/atomic"

	"github.com/obsfx/oversee/internal/domain"
)

type flowProgressFeed struct {
	mu      sync.Mutex
	pending map[domain.Comparison]domain.FlowProgress
	changed wakeup
}

func newFlowProgressFeed() *flowProgressFeed {
	return &flowProgressFeed{pending: map[domain.Comparison]domain.FlowProgress{}, changed: newWakeup()}
}

func (f *flowProgressFeed) push(progress domain.FlowProgress) {
	f.mu.Lock()
	f.pending[progress.Comparison] = progress
	f.mu.Unlock()
	f.changed.raise()
}

func (f *flowProgressFeed) follow(ctx context.Context, publish func(domain.FlowProgress)) {
	f.changed.follow(ctx, func() {
		for _, progress := range f.drain() {
			publish(progress)
		}
	})
}

func (f *flowProgressFeed) drain() []domain.FlowProgress {
	f.mu.Lock()
	defer f.mu.Unlock()
	progress := slices.Collect(maps.Values(f.pending))
	clear(f.pending)
	return progress
}

type flowReporter struct {
	comparison domain.Comparison
	publish    func(domain.FlowProgress)
	throttle   *throttle
	current    atomic.Pointer[flowTracker]
}

func newFlowReporter(comparison domain.Comparison, clock clock, publish func(domain.FlowProgress)) *flowReporter {
	reporter := &flowReporter{comparison: comparison, publish: publish}
	reporter.throttle = newThrottle(progressInterval, clock, reporter.emit)
	return reporter
}

func (r *flowReporter) begin() *flowTracker {
	tracker := &flowTracker{reporter: r}
	r.current.Store(tracker)
	r.throttle.flush()
	return tracker
}

func (r *flowReporter) touch(tracker *flowTracker) {
	if r.current.Load() == tracker {
		r.throttle.touch()
	}
}

func (r *flowReporter) flush(tracker *flowTracker) {
	if r.current.Load() == tracker {
		r.throttle.flush()
	}
}

func (r *flowReporter) emit() {
	if tracker := r.current.Load(); tracker != nil {
		r.publish(tracker.progressOf(r.comparison))
	}
}

type flowTracker struct {
	reporter *flowReporter
	mu       sync.Mutex
	groups   []domain.FlowGroupProgress
}

func (t *flowTracker) track(server string) flowTally {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.groups = append(t.groups, domain.FlowGroupProgress{Server: server, Phase: domain.FlowPhaseStarting})
	return flowTally{tracker: t, index: len(t.groups) - 1}
}

func (t *flowTracker) grouped(servers []domain.FlowServer) {
	t.mu.Lock()
	for _, server := range servers {
		if !t.tracks(server.Server) {
			t.groups = append(t.groups, domain.FlowGroupProgress{Server: server.Server, Phase: domain.FlowPhaseDone})
		}
	}
	t.mu.Unlock()
	t.reporter.flush(t)
}

func (t *flowTracker) tracks(server string) bool {
	return slices.ContainsFunc(t.groups, func(group domain.FlowGroupProgress) bool {
		return group.Server == server
	})
}

func (t *flowTracker) report(index int, change func(*domain.FlowGroupProgress)) {
	t.mu.Lock()
	change(&t.groups[index])
	t.mu.Unlock()
	t.reporter.touch(t)
}

func (t *flowTracker) finish() {
	t.mu.Lock()
	for index := range t.groups {
		t.groups[index].Phase = domain.FlowPhaseDone
	}
	t.mu.Unlock()
	t.reporter.flush(t)
}

func (t *flowTracker) progressOf(comparison domain.Comparison) domain.FlowProgress {
	t.mu.Lock()
	defer t.mu.Unlock()
	return domain.NewFlowProgress(comparison, t.groups)
}

type flowTally struct {
	tracker *flowTracker
	index   int
}

func (t flowTally) reading(files int) {
	t.tracker.report(t.index, func(group *domain.FlowGroupProgress) {
		group.Phase = domain.FlowPhaseReading
		group.Files.Total = files
	})
}

func (t flowTally) read() {
	t.tracker.report(t.index, func(group *domain.FlowGroupProgress) {
		group.Files.Done++
	})
}

func (t flowTally) tracing(functions int) {
	t.tracker.report(t.index, func(group *domain.FlowGroupProgress) {
		group.Phase = domain.FlowPhaseTracing
		group.Functions.Total = functions
	})
}

func (t flowTally) traced() {
	t.tracker.report(t.index, func(group *domain.FlowGroupProgress) {
		group.Functions.Done++
	})
}

func (t flowTally) finish() {
	t.tracker.report(t.index, func(group *domain.FlowGroupProgress) {
		group.Phase = domain.FlowPhaseDone
	})
}

type flowTrace struct {
	tally    flowTally
	walked   map[string]bool
	called   map[string]bool
	finished map[string]bool
}

func newFlowTrace(tally flowTally) flowTrace {
	return flowTrace{tally: tally, walked: map[string]bool{}, called: map[string]bool{}, finished: map[string]bool{}}
}

func (t flowTrace) walk(id string) {
	t.walked[id] = true
	if t.called[id] {
		t.finish(id)
	}
}

func (t flowTrace) call(id string) {
	t.called[id] = true
	if t.walked[id] {
		t.finish(id)
	}
}

func (t flowTrace) finish(id string) {
	if t.finished[id] {
		return
	}
	t.finished[id] = true
	t.tally.traced()
}
