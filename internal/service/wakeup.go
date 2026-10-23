package service

import "context"

type wakeup chan struct{}

func newWakeup() wakeup {
	return make(wakeup, 1)
}

func (w wakeup) raise() {
	select {
	case w <- struct{}{}:
	default:
	}
}

func (w wakeup) follow(ctx context.Context, run func()) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-w:
			run()
		}
	}
}
