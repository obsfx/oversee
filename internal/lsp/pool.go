package lsp

import (
	"context"
	"errors"
	"strings"
	"sync"
	"time"
)

const (
	startTimeout    = 2 * time.Minute
	shutdownTimeout = 3 * time.Second
	sweepInterval   = time.Minute
)

var (
	ErrStarting     = errors.New("language server is starting")
	errStartTimeout = errors.New("language server did not initialize in time")
	errStopped      = errors.New("language server session was stopped")
)

type Launch struct {
	Key                   string
	Root                  string
	InitializationOptions map[string]any
	Start                 func(ctx context.Context) (Transport, error)
}

type Pool struct {
	ctx      context.Context
	cancel   context.CancelFunc
	idle     time.Duration
	retry    time.Duration
	mu       sync.Mutex
	closed   bool
	sessions map[string]*session
	group    sync.WaitGroup
}

type session struct {
	ready    chan struct{}
	cancel   context.CancelCauseFunc
	client   *Client
	err      error
	failedAt time.Time
	lastUsed time.Time
}

func NewPool(idle, retry time.Duration) *Pool {
	ctx, cancel := context.WithCancel(context.Background())
	pool := &Pool{ctx: ctx, cancel: cancel, idle: idle, retry: retry, sessions: map[string]*session{}}
	pool.group.Go(pool.sweep)
	return pool
}

func (p *Pool) Client(ctx context.Context, launch Launch) (*Client, error) {
	p.mu.Lock()
	current, err := p.session(launch)
	p.mu.Unlock()
	if err != nil {
		return nil, err
	}
	select {
	case <-current.ready:
		if current.err != nil {
			return nil, current.err
		}
		return current.client, nil
	case <-ctx.Done():
		return nil, ErrStarting
	}
}

func (p *Pool) FilesChanged(events []FileEvent) {
	if len(events) == 0 {
		return
	}
	p.mu.Lock()
	defer p.mu.Unlock()
	for _, current := range p.sessions {
		if current.alive() {
			p.group.Go(func() {
				current.client.FilesChanged(events)
			})
		}
	}
}

func (p *Pool) Stop(prefix string) {
	p.mu.Lock()
	var stopping []*session
	for key, current := range p.sessions {
		if strings.HasPrefix(key, prefix) {
			delete(p.sessions, key)
			stopping = append(stopping, current)
		}
	}
	p.mu.Unlock()
	stopAll(stopping)
}

func (p *Pool) Close() {
	p.mu.Lock()
	p.closed = true
	p.mu.Unlock()
	p.Stop("")
	p.cancel()
	p.group.Wait()
}

func (p *Pool) session(launch Launch) (*session, error) {
	if p.closed {
		return nil, ErrClosed
	}
	now := time.Now()
	current, exists := p.sessions[launch.Key]
	if exists && current.crashed() {
		current.cancel(errStopped)
		current = failedSession(current.client.Err(), now)
		p.sessions[launch.Key] = current
	}
	if exists && current.finished() && current.err != nil {
		if now.Sub(current.failedAt) < p.retry {
			return nil, current.err
		}
		exists = false
	}
	if !exists {
		current = p.start(launch)
		p.sessions[launch.Key] = current
	}
	current.lastUsed = now
	return current, nil
}

func (p *Pool) start(launch Launch) *session {
	ctx, cancel := context.WithCancelCause(p.ctx)
	started := &session{ready: make(chan struct{}), cancel: cancel}
	p.group.Go(func() {
		defer close(started.ready)
		transport, err := launch.Start(ctx)
		if err == nil {
			startCtx, stop := context.WithTimeoutCause(ctx, startTimeout, errStartTimeout)
			started.client, err = Start(startCtx, transport, launch.Root, launch.InitializationOptions)
			stop()
		}
		if err != nil {
			started.err = err
			started.failedAt = time.Now()
			cancel(err)
		}
	})
	return started
}

func (p *Pool) sweep() {
	tick := time.Tick(sweepInterval)
	for {
		select {
		case <-p.ctx.Done():
			return
		case <-tick:
			p.mu.Lock()
			var idle []*session
			for key, current := range p.sessions {
				if current.finished() && time.Since(current.lastUsed) > p.idle {
					delete(p.sessions, key)
					idle = append(idle, current)
				}
			}
			p.mu.Unlock()
			stopAll(idle)
		}
	}
}

func failedSession(err error, at time.Time) *session {
	ready := make(chan struct{})
	close(ready)
	return &session{ready: ready, cancel: func(error) {}, err: err, failedAt: at}
}

func stopAll(sessions []*session) {
	var stopping sync.WaitGroup
	for _, current := range sessions {
		stopping.Go(current.stop)
	}
	stopping.Wait()
}

func (s *session) stop() {
	defer s.cancel(errStopped)
	ctx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	select {
	case <-s.ready:
	case <-ctx.Done():
		return
	}
	if s.client != nil {
		s.client.Shutdown(ctx)
	}
}

func (s *session) finished() bool {
	select {
	case <-s.ready:
		return true
	default:
		return false
	}
}

func (s *session) alive() bool {
	return s.finished() && s.err == nil && !s.crashed()
}

func (s *session) crashed() bool {
	if !s.finished() || s.err != nil {
		return false
	}
	select {
	case <-s.client.Done():
		return true
	default:
		return false
	}
}
