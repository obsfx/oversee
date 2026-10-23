package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/obsfx/oversee/internal/domain"
)

const (
	installIdleTimeout = 3 * time.Minute
	progressInterval   = 250 * time.Millisecond
)

var (
	errInstallStalled  = errors.New("install made no progress for 3 minutes")
	errInstallCanceled = errors.New("install canceled")
)

type jobKind int

const (
	jobInstall jobKind = iota + 1
	jobRemove
)

type installJobs struct {
	mu       sync.Mutex
	running  map[string]jobKind
	cancels  map[string]context.CancelCauseFunc
	failures map[string]string
	progress map[string]domain.InstallProgress
	throttle *throttle
	ctx      context.Context
	cancel   context.CancelFunc
	group    sync.WaitGroup
	notify   func()
}

func newInstallJobs(notify func()) *installJobs {
	ctx, cancel := context.WithCancel(context.Background())
	return &installJobs{
		running:  map[string]jobKind{},
		cancels:  map[string]context.CancelCauseFunc{},
		failures: map[string]string{},
		progress: map[string]domain.InstallProgress{},
		throttle: newThrottle(progressInterval, systemClock{}, notify),
		ctx:      ctx,
		cancel:   cancel,
		notify:   notify,
	}
}

func (j *installJobs) start(id string, work func(ctx context.Context, report func(domain.InstallProgress)) error) (bool, error) {
	j.mu.Lock()
	defer j.mu.Unlock()
	switch {
	case j.running[id] == jobInstall:
		return false, nil
	case j.running[id] == jobRemove || j.ctx.Err() != nil:
		return false, fmt.Errorf("%w: %s", domain.ErrLanguageServerBusy, id)
	}
	ctx, cancel := context.WithCancelCause(j.ctx)
	j.running[id] = jobInstall
	j.cancels[id] = cancel
	delete(j.failures, id)
	j.group.Go(func() {
		defer cancel(nil)
		idle := time.AfterFunc(installIdleTimeout, func() {
			cancel(errInstallStalled)
		})
		defer idle.Stop()
		err := work(ctx, func(progress domain.InstallProgress) {
			idle.Reset(installIdleTimeout)
			j.report(id, progress)
		})
		if err != nil {
			switch cause := context.Cause(ctx); {
			case errors.Is(cause, errInstallCanceled):
				slog.Info("language server install canceled", "server", id)
				err = nil
			case errors.Is(cause, errInstallStalled):
				err = errInstallStalled
			}
		}
		j.finish(id, err)
	})
	j.notify()
	return true, nil
}

func (j *installJobs) exclusive(id string, work func() error) error {
	j.mu.Lock()
	if j.running[id] != 0 {
		j.mu.Unlock()
		return fmt.Errorf("%w: %s", domain.ErrLanguageServerBusy, id)
	}
	j.running[id] = jobRemove
	j.mu.Unlock()
	err := work()
	j.mu.Lock()
	delete(j.running, id)
	delete(j.failures, id)
	j.mu.Unlock()
	j.notify()
	return err
}

func (j *installJobs) cancelInstall(id string) {
	j.mu.Lock()
	defer j.mu.Unlock()
	if cancel, ok := j.cancels[id]; ok {
		cancel(errInstallCanceled)
	}
}

func (j *installJobs) report(id string, progress domain.InstallProgress) {
	j.mu.Lock()
	changed := j.progress[id] != progress
	j.progress[id] = progress
	j.mu.Unlock()
	if changed {
		j.throttle.touch()
	}
}

func (j *installJobs) finish(id string, err error) {
	j.mu.Lock()
	delete(j.running, id)
	delete(j.cancels, id)
	delete(j.progress, id)
	if err != nil && j.ctx.Err() == nil {
		j.failures[id] = err.Error()
		slog.Warn("language server install failed", "server", id, "error", err)
	}
	j.mu.Unlock()
	j.throttle.flush()
}

func (j *installJobs) state(id string) (bool, string, domain.InstallProgress) {
	j.mu.Lock()
	defer j.mu.Unlock()
	return j.running[id] == jobInstall, j.failures[id], j.progress[id]
}

func (j *installJobs) close() {
	j.mu.Lock()
	j.cancel()
	j.mu.Unlock()
	j.group.Wait()
}
