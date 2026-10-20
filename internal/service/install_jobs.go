package service

import (
	"context"
	"log/slog"
	"sync"
)

type installJobs struct {
	mu       sync.Mutex
	running  map[string]bool
	failures map[string]string
	ctx      context.Context
	cancel   context.CancelFunc
	group    sync.WaitGroup
	notify   func()
}

func newInstallJobs(notify func()) *installJobs {
	ctx, cancel := context.WithCancel(context.Background())
	return &installJobs{
		running:  map[string]bool{},
		failures: map[string]string{},
		ctx:      ctx,
		cancel:   cancel,
		notify:   notify,
	}
}

func (j *installJobs) start(id string, work func(ctx context.Context) error) {
	j.mu.Lock()
	if j.running[id] || j.ctx.Err() != nil {
		j.mu.Unlock()
		return
	}
	j.running[id] = true
	delete(j.failures, id)
	j.mu.Unlock()
	j.notify()
	j.group.Go(func() {
		j.finish(id, work(j.ctx))
	})
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
	return j.running[id], j.failures[id]
}

func (j *installJobs) clearFailure(id string) {
	j.mu.Lock()
	defer j.mu.Unlock()
	delete(j.failures, id)
}

func (j *installJobs) close() {
	j.cancel()
	j.group.Wait()
}
