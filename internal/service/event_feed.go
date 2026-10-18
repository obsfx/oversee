package service

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/repository"
)

const followInterval = 100 * time.Millisecond

type EventFeed struct {
	reads  repository.Repositories
	detect func(ctx context.Context) (ChangeDetector, error)
}

func NewEventFeed(reads repository.Repositories, detect func(ctx context.Context) (ChangeDetector, error)) *EventFeed {
	return &EventFeed{reads: reads, detect: detect}
}

func (f *EventFeed) LatestID(ctx context.Context) (int64, error) {
	return f.reads.Events.LatestID(ctx)
}

func (f *EventFeed) After(ctx context.Context, id int64) ([]domain.RecordedEvent, error) {
	return f.reads.Events.After(ctx, id)
}

func (f *EventFeed) Follow(ctx context.Context, publish func(events []domain.RecordedEvent)) (err error) {
	detector, err := f.detect(ctx)
	if err != nil {
		return err
	}
	defer func() {
		err = errors.Join(err, detector.Close())
	}()
	lastID, err := f.LatestID(ctx)
	if err != nil {
		return err
	}
	ticker := time.NewTicker(followInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
		}
		lastID = f.publishNew(ctx, detector, lastID, publish)
	}
}

func (f *EventFeed) publishNew(ctx context.Context, detector ChangeDetector, lastID int64, publish func(events []domain.RecordedEvent)) int64 {
	changed, err := detector.Changed(ctx)
	if err != nil {
		slog.Warn("event feed change check failed", "error", err)
		return lastID
	}
	if !changed {
		return lastID
	}
	events, err := f.After(ctx, lastID)
	if err != nil {
		slog.Warn("event feed read failed", "error", err)
		return lastID
	}
	if len(events) == 0 {
		return lastID
	}
	publish(events)
	return events[len(events)-1].ID
}
