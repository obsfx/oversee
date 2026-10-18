package repository

import (
	"context"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/storage/sqlite/sqldb"
)

type ReplyRepository struct {
	queries *sqldb.Queries
}

func (r ReplyRepository) ListBySession(ctx context.Context, sessionID string) ([]domain.Reply, error) {
	rows, err := r.queries.ListSessionReplies(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	replies := make([]domain.Reply, 0, len(rows))
	for _, row := range rows {
		replies = append(replies, domain.Reply{
			ID:        row.ID,
			CommentID: row.CommentID,
			Author:    row.Author,
			Body:      row.Body,
			CreatedAt: timeOf(row.CreatedAt),
		})
	}
	return replies, nil
}

func (r ReplyRepository) Insert(ctx context.Context, reply domain.Reply) error {
	return r.queries.InsertReply(ctx, sqldb.InsertReplyParams{
		ID:        reply.ID,
		CommentID: reply.CommentID,
		Author:    reply.Author,
		Body:      reply.Body,
		CreatedAt: millis(reply.CreatedAt),
	})
}
