package repository

import (
	"context"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/storage/sqlite/sqldb"
)

type EventRepository struct {
	queries *sqldb.Queries
	codec   EventCodec
}

func (r EventRepository) Append(ctx context.Context, events ...domain.Event) error {
	for _, event := range events {
		payload, err := r.codec.Encode(event)
		if err != nil {
			return err
		}
		err = r.queries.InsertEvent(ctx, sqldb.InsertEventParams{
			Kind:      string(event.Kind()),
			Payload:   string(payload),
			CreatedAt: millis(event.OccurredAt()),
		})
		if err != nil {
			return err
		}
	}
	return nil
}

func (r EventRepository) After(ctx context.Context, id int64) ([]domain.RecordedEvent, error) {
	rows, err := r.queries.ListEventsAfter(ctx, id)
	if err != nil {
		return nil, err
	}
	events := make([]domain.RecordedEvent, 0, len(rows))
	for _, row := range rows {
		events = append(events, domain.RecordedEvent{
			ID:        row.ID,
			Kind:      domain.EventKind(row.Kind),
			Payload:   []byte(row.Payload),
			CreatedAt: timeOf(row.CreatedAt),
		})
	}
	return events, nil
}

func (r EventRepository) LatestID(ctx context.Context) (int64, error) {
	return r.queries.LatestEventID(ctx)
}
