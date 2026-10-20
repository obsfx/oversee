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

const installTimeout = 15 * time.Minute

var errInstallTimeout = errors.New("install did not finish within 15 minutes")

type jobKind int

const (
	jobInstall jobKind = iota + 1
	jobRemove
)

type installJobs struct {
	mu       sync.Mutex
	running  map[string]jobKind
	failures map[string]string
	ctx      context.Context
	cancel   context.CancelFunc
	group    sync.WaitGroup
	notify   func()
}

func newInstallJobs(notify func()) *installJobs {
	ctx, cancel := context.WithCancel(context.Background())
	return &installJobs{
		running:  map[string]jobKind{},
		failures: map[string]string{},
		ctx:      ctx,
		cancel:   cancel,
		notify:   notify,
	}
}

func (j *installJobs) start(id string, work func(ctx context.Context) error) (bool, error) {
	j.mu.Lock()
	defer j.mu.Unlock()
	switch {
	case j.running[id] == jobInstall:
		return false, nil
	case j.running[id] == jobRemove || j.ctx.Err() != nil:
		return false, fmt.Errorf("%w: %s", domain.ErrLanguageServerBusy, id)
	}
	j.running[id] = jobInstall
	delete(j.failures, id)
	j.group.Go(func() {
		ctx, cancel := context.WithTimeoutCause(j.ctx, installTimeout, errInstallTimeout)
		defer cancel()
		err := work(ctx)
		if err != nil && errors.Is(context.Cause(ctx), errInstallTimeout) {
			err = errInstallTimeout
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

func (j *installJobs) finish(id string, err error) {
	j.mu.Lock()
	delete(j.running, id)
	if err != nil && j.ctx.Err() == nil {
		j.failures[id] = err.Error()
		slog.Warn("language server install failed", "server", id, "error", err)
	}
	j.mu.Unlock()
	j.notify()
}

func (j *installJobs) state(id string) (bool, string) {
	j.mu.Lock()
	defer j.mu.Unlock()
	return j.running[id] == jobInstall, j.failures[id]
}

func (j *installJobs) close() {
	j.mu.Lock()
	j.cancel()
	j.mu.Unlock()
	j.group.Wait()
}
