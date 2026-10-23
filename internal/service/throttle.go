package service

import (
	"sync"
	"time"
)

type clock interface {
	Now() time.Time
	AfterFunc(wait time.Duration, run func()) stopper
}

type stopper interface {
	Stop() bool
}

type systemClock struct{}

func (systemClock) Now() time.Time {
	return time.Now()
}

func (systemClock) AfterFunc(wait time.Duration, run func()) stopper {
	return time.AfterFunc(wait, run)
}

type throttle struct {
	interval time.Duration
	clock    clock
	fire     func()
	mu       sync.Mutex
	last     time.Time
	pending  stopper
	round    uint64
}

func newThrottle(interval time.Duration, clock clock, fire func()) *throttle {
	return &throttle{interval: interval, clock: clock, fire: fire}
}

func (t *throttle) touch() {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.pending != nil {
		return
	}
	wait := t.interval - t.clock.Now().Sub(t.last)
	if wait <= 0 {
		t.fireLocked()
		return
	}
	t.round++
	round := t.round
	t.pending = t.clock.AfterFunc(wait, func() {
		t.trail(round)
	})
}

func (t *throttle) flush() {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.pending != nil {
		t.pending.Stop()
		t.pending = nil
	}
	t.fireLocked()
}

func (t *throttle) trail(round uint64) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.pending == nil || t.round != round {
		return
	}
	t.pending = nil
	t.fireLocked()
}

func (t *throttle) fireLocked() {
	t.last = t.clock.Now()
	t.fire()
}
