package repository

import (
	"context"
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
		Body:      row.Body,
		Snapshot:  snapshot,
		CreatedAt: timeOf(row.CreatedAt),
		UpdatedAt: timeOf(row.UpdatedAt),
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
