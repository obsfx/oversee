package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/storage/sqlite"
	"github.com/obsfx/oversee/internal/storage/sqlite/sqldb"
)

type EventCodec interface {
	Encode(event domain.Event) ([]byte, error)
}

type Repositories struct {
	Sessions      SessionRepository
	Comments      CommentRepository
	Replies       ReplyRepository
	Notifications NotificationRepository
	Events        EventRepository
}

func New(db sqldb.DBTX, codec EventCodec) Repositories {
	queries := sqldb.New(db)
	return Repositories{
		Sessions:      SessionRepository{queries: queries},
		Comments:      CommentRepository{queries: queries},
		Replies:       ReplyRepository{queries: queries},
		Notifications: NotificationRepository{queries: queries},
		Events:        EventRepository{queries: queries, codec: codec},
	}
}

type TxRunner struct {
	db    *sqlite.DB
	codec EventCodec
}

func NewTxRunner(db *sqlite.DB, codec EventCodec) *TxRunner {
	return &TxRunner{db: db, codec: codec}
}

func (t *TxRunner) Within(ctx context.Context, work func(repos Repositories) error) error {
	return t.db.InTx(ctx, func(tx *sql.Tx) error {
		return work(New(tx, t.codec))
	})
}

func millis(at time.Time) int64 {
	return at.UnixMilli()
}

func timeOf(milliseconds int64) time.Time {
	return time.UnixMilli(milliseconds)
}

func optionalTime(value sql.NullInt64) time.Time {
	if !value.Valid {
		return time.Time{}
	}
	return timeOf(value.Int64)
}

func notFound(entity, id string, err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("%s %s: %w", entity, id, domain.ErrNotFound)
	}
	return err
}

func requireAffected(entity, id string, affected int64, err error) error {
	if err != nil {
		return err
	}
	if affected == 0 {
		return fmt.Errorf("%s %s: %w", entity, id, domain.ErrNotFound)
	}
	return nil
}
