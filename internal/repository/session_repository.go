package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/storage/sqlite/sqldb"
)

const sessionEntity = "review session"

type SessionRepository struct {
	queries *sqldb.Queries
}

func (r SessionRepository) FindOpen(ctx context.Context, comparison domain.Comparison) (domain.Session, error) {
	row, err := r.queries.FindOpenSession(ctx, sqldb.FindOpenSessionParams{Source: comparison.Source, Target: comparison.Target})
	if err != nil {
		return domain.Session{}, notFound("open "+sessionEntity+" for", comparison.Source+".."+comparison.Target, err)
	}
	return sessionOf(sqldb.GetSessionRow(row)), nil
}

func (r SessionRepository) Get(ctx context.Context, id string) (domain.Session, error) {
	row, err := r.queries.GetSession(ctx, id)
	if err != nil {
		return domain.Session{}, notFound(sessionEntity, id, err)
	}
	return sessionOf(row), nil
}

func (r SessionRepository) ListFinishedByComparison(ctx context.Context, comparison domain.Comparison) ([]domain.Session, error) {
	rows, err := r.queries.ListFinishedSessionsByComparison(ctx, sqldb.ListFinishedSessionsByComparisonParams{
		Source: comparison.Source,
		Target: comparison.Target,
	})
	if err != nil {
		return nil, err
	}
	sessions := make([]domain.Session, 0, len(rows))
	for _, row := range rows {
		sessions = append(sessions, sessionOf(sqldb.GetSessionRow(row)))
	}
	return sessions, nil
}

func (r SessionRepository) ListFinished(ctx context.Context, page domain.PageRequest) ([]domain.Session, error) {
	rows, err := r.queries.ListFinishedSessions(ctx, sqldb.ListFinishedSessionsParams{
		Limit:  int64(page.Limit),
		Offset: int64(page.Offset()),
	})
	if err != nil {
		return nil, err
	}
	sessions := make([]domain.Session, 0, len(rows))
	for _, row := range rows {
		sessions = append(sessions, sessionOf(sqldb.GetSessionRow(row)))
	}
	return sessions, nil
}

func (r SessionRepository) CountFinished(ctx context.Context) (int, error) {
	count, err := r.queries.CountFinishedSessions(ctx)
	return int(count), err
}

func (r SessionRepository) Insert(ctx context.Context, session domain.Session) error {
	return r.queries.InsertSession(ctx, sqldb.InsertSessionParams{
		ID:        session.ID,
		Source:    session.Comparison.Source,
		Target:    session.Comparison.Target,
		Status:    string(session.Status),
		CreatedAt: millis(session.CreatedAt),
		UpdatedAt: millis(session.CreatedAt),
	})
}

func (r SessionRepository) SaveFinished(ctx context.Context, session domain.Session) error {
	return r.queries.UpdateSessionFinished(ctx, sqldb.UpdateSessionFinishedParams{
		FinishedAt: sql.NullInt64{Int64: millis(session.FinishedAt), Valid: true},
		Status:     string(session.Status),
		UpdatedAt:  millis(session.FinishedAt),
		ID:         session.ID,
	})
}

func (r SessionRepository) SaveStatus(ctx context.Context, session domain.Session, at time.Time) error {
	return r.queries.UpdateSessionStatus(ctx, sqldb.UpdateSessionStatusParams{
		Status:    string(session.Status),
		UpdatedAt: millis(at),
		ID:        session.ID,
	})
}

func sessionOf(row sqldb.GetSessionRow) domain.Session {
	return domain.Session{
		ID:           row.ID,
		Comparison:   domain.Comparison{Source: row.Source, Target: row.Target},
		Status:       domain.Status(row.Status),
		CreatedAt:    timeOf(row.CreatedAt),
		FinishedAt:   optionalTime(row.FinishedAt),
		CommentCount: int(row.CommentCount),
	}
}
