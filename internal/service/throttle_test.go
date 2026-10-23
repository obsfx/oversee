package service

import (
	"fmt"
	"slices"
	"sync"
	"testing"
	"time"
)

type fakeClock struct {
	mu     sync.Mutex
	start  time.Time
	now    time.Time
	timers []*fakeTimer
}

type fakeTimer struct {
	clock *fakeClock
	at    time.Time
	run   func()
	fired bool
}

func newFakeClock() *fakeClock {
	start := time.Date(2026, time.January, 1, 0, 0, 0, 0, time.UTC)
	return &fakeClock{start: start, now: start}
}

func (c *fakeClock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.now
}

func (c *fakeClock) AfterFunc(wait time.Duration, run func()) stopper {
	c.mu.Lock()
	defer c.mu.Unlock()
	timer := &fakeTimer{clock: c, at: c.now.Add(wait), run: run}
	c.timers = append(c.timers, timer)
	return timer
}

func (t *fakeTimer) Stop() bool {
	t.clock.mu.Lock()
	defer t.clock.mu.Unlock()
	active := !t.fired
	t.fired = true
	return active
}

func (c *fakeClock) advance(wait time.Duration) {
	target := c.Now().Add(wait)
	for {
		run, found := c.next(target)
		if !found {
			break
		}
		run()
	}
	c.moveTo(target)
}

func (c *fakeClock) dispatch(wait time.Duration) []func() {
	target := c.Now().Add(wait)
	var runs []func()
	for {
		run, found := c.next(target)
		if !found {
			break
		}
		runs = append(runs, run)
	}
	c.moveTo(target)
	return runs
}

func (c *fakeClock) next(target time.Time) (func(), bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	var due *fakeTimer
	for _, timer := range c.timers {
		if !timer.fired && !timer.at.After(target) && (due == nil || timer.at.Before(due.at)) {
			due = timer
		}
	}
	if due == nil {
		return nil, false
	}
	due.fired = true
	c.now = due.at
	return due.run, true
}

func (c *fakeClock) moveTo(target time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.now = target
}

func (c *fakeClock) active() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	active := 0
	for _, timer := range c.timers {
		if !timer.fired {
			active++
		}
	}
	return active
}

type throttleProbe struct {
	clock    *fakeClock
	throttle *throttle
	state    int
	sent     []string
}

func newThrottleProbe() *throttleProbe {
	probe := &throttleProbe{clock: newFakeClock()}
	probe.throttle = newThrottle(progressInterval, probe.clock, probe.send)
	return probe
}

func (p *throttleProbe) send() {
	p.sent = append(p.sent, fmt.Sprintf("state %d at %s", p.state, p.clock.Now().Sub(p.clock.start)))
}

func (p *throttleProbe) change(state int) {
	p.state = state
	p.throttle.touch()
}

func (p *throttleProbe) force(state int) {
	p.state = state
	p.throttle.flush()
}

func TestThrottle(t *testing.T) {
	tests := []struct {
		name        string
		run         func(probe *throttleProbe)
		want        []string
		wantPending int
	}{
		{
			name: "the first change goes out at once",
			run: func(probe *throttleProbe) {
				probe.change(1)
			},
			want: []string{"state 1 at 0s"},
		},
		{
			name: "changes inside the interval wait for one trailing signal",
			run: func(probe *throttleProbe) {
				probe.change(1)
				probe.clock.advance(100 * time.Millisecond)
				probe.change(2)
				probe.clock.advance(100 * time.Millisecond)
				probe.change(3)
				probe.clock.advance(49 * time.Millisecond)
			},
			want:        []string{"state 1 at 0s"},
			wantPending: 1,
		},
		{
			name: "the trailing signal carries the latest state when the interval ends",
			run: func(probe *throttleProbe) {
				probe.change(1)
				probe.clock.advance(100 * time.Millisecond)
				probe.change(2)
				probe.clock.advance(100 * time.Millisecond)
				probe.change(3)
				probe.clock.advance(50 * time.Millisecond)
			},
			want: []string{"state 1 at 0s", "state 3 at 250ms"},
		},
		{
			name: "a change after a quiet interval goes out at once",
			run: func(probe *throttleProbe) {
				probe.change(1)
				probe.clock.advance(time.Second)
				probe.change(2)
			},
			want: []string{"state 1 at 0s", "state 2 at 1s"},
		},
		{
			name: "a change right after a trailing signal waits a full interval",
			run: func(probe *throttleProbe) {
				probe.change(1)
				probe.clock.advance(100 * time.Millisecond)
				probe.change(2)
				probe.clock.advance(150 * time.Millisecond)
				probe.change(3)
				probe.clock.advance(249 * time.Millisecond)
				probe.change(4)
				probe.clock.advance(time.Millisecond)
			},
			want: []string{"state 1 at 0s", "state 2 at 250ms", "state 4 at 500ms"},
		},
		{
			name: "a forced send goes out at once and cancels the pending trailing one",
			run: func(probe *throttleProbe) {
				probe.change(1)
				probe.clock.advance(100 * time.Millisecond)
				probe.change(2)
				probe.force(3)
			},
			want: []string{"state 1 at 0s", "state 3 at 100ms"},
		},
		{
			name: "nothing trails a forced send",
			run: func(probe *throttleProbe) {
				probe.change(1)
				probe.clock.advance(100 * time.Millisecond)
				probe.change(2)
				probe.force(3)
				probe.clock.advance(time.Second)
			},
			want: []string{"state 1 at 0s", "state 3 at 100ms"},
		},
		{
			name: "forced sends go out back to back",
			run: func(probe *throttleProbe) {
				probe.force(1)
				probe.force(2)
			},
			want: []string{"state 1 at 0s", "state 2 at 0s"},
		},
		{
			name: "a forced send restarts the interval",
			run: func(probe *throttleProbe) {
				probe.change(1)
				probe.clock.advance(200 * time.Millisecond)
				probe.force(2)
				probe.clock.advance(100 * time.Millisecond)
				probe.change(3)
				probe.clock.advance(149 * time.Millisecond)
				probe.change(4)
				probe.clock.advance(time.Millisecond)
			},
			want: []string{"state 1 at 0s", "state 2 at 200ms", "state 4 at 450ms"},
		},
		{
			name: "a trailing timer that fired before the forced send stopped it sends nothing",
			run: func(probe *throttleProbe) {
				probe.change(1)
				probe.clock.advance(100 * time.Millisecond)
				probe.change(2)
				late := probe.clock.dispatch(150 * time.Millisecond)
				probe.force(3)
				probe.clock.advance(10 * time.Millisecond)
				probe.change(4)
				for _, run := range late {
					run()
				}
				probe.clock.advance(240 * time.Millisecond)
			},
			want: []string{"state 1 at 0s", "state 3 at 250ms", "state 4 at 500ms"},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			probe := newThrottleProbe()

			test.run(probe)

			if !slices.Equal(probe.sent, test.want) {
				t.Errorf("sent\n got: %q\nwant: %q", probe.sent, test.want)
			}
			if pending := probe.clock.active(); pending != test.wantPending {
				t.Errorf("pending trailing signals = %d, want %d", pending, test.wantPending)
			}
		})
	}
}
