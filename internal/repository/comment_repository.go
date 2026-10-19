package repository

import (
	"context"
	"database/sql"
	"encoding/json/v2"
	"time"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/storage/sqlite/sqldb"
)

const commentEntity = "comment"

type snapshotLineRecord struct {
	Number int    `json:"number"`
	Text   string `json:"text"`
}

type CommentRepository struct {
	queries *sqldb.Queries
}

func (r CommentRepository) ListBySession(ctx context.Context, sessionID string) ([]domain.Comment, error) {
	rows, err := r.queries.ListSessionComments(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	comments := make([]domain.Comment, 0, len(rows))
	for _, row := range rows {
		comment, err := commentOf(row)
		if err != nil {
			return nil, err
		}
		comments = append(comments, comment)
	}
	return comments, nil
}

func (r CommentRepository) Get(ctx context.Context, id string) (domain.Comment, error) {
	row, err := r.queries.GetComment(ctx, id)
	if err != nil {
		return domain.Comment{}, notFound(commentEntity, id, err)
	}
	return commentOf(row)
}

func (r CommentRepository) Insert(ctx context.Context, comment domain.Comment) error {
	snapshot, err := encodeSnapshot(comment.Snapshot)
	if err != nil {
		return err
	}
	return r.queries.InsertComment(ctx, sqldb.InsertCommentParams{
		ID:        comment.ID,
		SessionID: comment.SessionID,
		FilePath:  comment.FilePath,
		Side:      string(comment.Range.Side),
		StartLine: int64(comment.Range.Start),
		EndLine:   int64(comment.Range.End),
		EndSide:   string(comment.Range.EndSide),
		Body:      comment.Body,
		Snapshot:  snapshot,
		CreatedAt: millis(comment.CreatedAt),
		UpdatedAt: millis(comment.UpdatedAt),
	})
}

func (r CommentRepository) UpdateBody(ctx context.Context, id, body string, at time.Time) error {
	affected, err := r.queries.UpdateCommentBody(ctx, sqldb.UpdateCommentBodyParams{Body: body, UpdatedAt: millis(at), ID: id})
	return requireAffected(commentEntity, id, affected, err)
}

func (r CommentRepository) Delete(ctx context.Context, id string) error {
	affected, err := r.queries.DeleteComment(ctx, id)
	return requireAffected(commentEntity, id, affected, err)
}

func (r CommentRepository) MarkOutdated(ctx context.Context, id string, at time.Time) (bool, error) {
	affected, err := r.queries.MarkCommentOutdated(ctx, sqldb.MarkCommentOutdatedParams{
		OutdatedAt: sql.NullInt64{Int64: millis(at), Valid: true},
		ID:         id,
	})
	return affected > 0, err
}

func (r CommentRepository) Move(ctx context.Context, moved domain.Comment, from domain.LineRange) (bool, error) {
	snapshot, err := encodeSnapshot(moved.Snapshot)
	if err != nil {
		return false, err
	}
	affected, err := r.queries.MoveComment(ctx, sqldb.MoveCommentParams{
		StartLine:     int64(moved.Range.Start),
		EndLine:       int64(moved.Range.End),
		Snapshot:      snapshot,
		ID:            moved.ID,
		FromStartLine: int64(from.Start),
		FromEndLine:   int64(from.End),
	})
	return affected > 0, err
}

func commentOf(row sqldb.Comment) (domain.Comment, error) {
	snapshot, err := decodeSnapshot(row.Snapshot)
	if err != nil {
		return domain.Comment{}, err
	}
	return domain.Comment{
		ID:        row.ID,
		SessionID: row.SessionID,
		FilePath:  row.FilePath,
		Range: domain.LineRange{
			Start:   int(row.StartLine),
			End:     int(row.EndLine),
			Side:    domain.Side(row.Side),
			EndSide: domain.Side(row.EndSide),
		},
		Body:       row.Body,
		Snapshot:   snapshot,
		CreatedAt:  timeOf(row.CreatedAt),
		UpdatedAt:  timeOf(row.UpdatedAt),
		OutdatedAt: optionalTime(row.OutdatedAt),
	}, nil
}

func encodeSnapshot(lines []domain.SnapshotLine) (string, error) {
	records := make([]snapshotLineRecord, 0, len(lines))
	for _, line := range lines {
		records = append(records, snapshotLineRecord{Number: line.Number, Text: line.Text})
	}
	encoded, err := json.Marshal(records)
	return string(encoded), err
}

func decodeSnapshot(encoded string) ([]domain.SnapshotLine, error) {
	var records []snapshotLineRecord
	if err := json.Unmarshal([]byte(encoded), &records); err != nil {
		return nil, err
	}
	lines := make([]domain.SnapshotLine, 0, len(records))
	for _, record := range records {
		lines = append(lines, domain.SnapshotLine{Number: record.Number, Text: record.Text})
	}
	return lines, nil
}
