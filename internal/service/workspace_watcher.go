package service

import (
	"context"
	"log/slog"
	"time"

	"github.com/obsfx/oversee/internal/domain"
)

const watchInterval = time.Second

type watchState struct {
	initialized bool
	previous    domain.WorkspaceFingerprint
	applied     domain.WorkspaceFingerprint
}

func (s *watchState) observe(next domain.WorkspaceFingerprint) (domain.WorkspaceChange, bool) {
	settled := next.ChangesSince(s.previous).IsEmpty() && !next.OperationInProgress
	s.previous = next
	if !settled {
		return domain.WorkspaceChange{}, false
	}
	s.initialized = true
	change := next.ChangesSince(s.applied)
	if change.IsEmpty() {
		return domain.WorkspaceChange{}, false
	}
	s.applied = next
	return change, true
}

type WorkspaceWatcher struct {
	probe      WorkspaceProbe
	reconciler Reconciler
	listeners  []WorkspaceListener
}

func NewWorkspaceWatcher(probe WorkspaceProbe, reconciler Reconciler) *WorkspaceWatcher {
	return &WorkspaceWatcher{probe: probe, reconciler: reconciler}
}

func (w *WorkspaceWatcher) Listen(listener WorkspaceListener) {
	w.listeners = append(w.listeners, listener)
}

func (w *WorkspaceWatcher) Follow(ctx context.Context, audience Audience, publish func(change domain.WorkspaceChange)) {
	state := &watchState{}
	tick := time.Tick(watchInterval)
	for {
		if !state.initialized || audience.HasClients() {
			w.check(ctx, state, publish)
		}
		select {
		case <-ctx.Done():
			return
		case <-tick:
		}
	}
}

func (w *WorkspaceWatcher) check(ctx context.Context, state *watchState, publish func(change domain.WorkspaceChange)) {
	fingerprint, err := w.probe.Fingerprint(ctx)
	if err != nil {
		if ctx.Err() == nil {
			slog.Warn("workspace fingerprint failed", "error", err)
		}
		return
	}
	change, settled := state.observe(fingerprint)
	if !settled {
		return
	}
	if err := w.reconciler.Reconcile(ctx, change); err != nil && ctx.Err() == nil {
		slog.Warn("comment reconcile failed", "error", err)
	}
	for _, listener := range w.listeners {
		listener.WorkspaceChanged(ctx, change)
	}
	publish(change)
}
