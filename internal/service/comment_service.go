package service

import (
	"context"
	"errors"
	"log/slog"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/repository"
)

type CommentService struct {
	tx      Transactor
	reads   repository.Repositories
	git     GitReader
	runtime Runtime
}

func NewCommentService(tx Transactor, reads repository.Repositories, git GitReader, runtime Runtime) *CommentService {
	return &CommentService{tx: tx, reads: reads, git: git, runtime: runtime}
}

func (s *CommentService) Active(ctx context.Context, comparison domain.Comparison) ([]domain.Comment, error) {
	if err := comparison.Validate(); err != nil {
		return nil, err
	}
	session, err := s.reads.Sessions.FindOpen(ctx, comparison)
	if errors.Is(err, domain.ErrNotFound) {
		return []domain.Comment{}, nil
	}
	if err != nil {
		return nil, err
	}
	return s.reads.Comments.ListBySession(ctx, session.ID)
}

func (s *CommentService) Create(ctx context.Context, comparison domain.Comparison, draft domain.CommentDraft) (domain.Comment, error) {
	if err := comparison.Validate(); err != nil {
		return domain.Comment{}, err
	}
	if err := draft.Validate(); err != nil {
		return domain.Comment{}, err
	}
	snapshot := draft.Range.Snapshot(s.commentedBlob(ctx, comparison, draft))
	now := s.runtime.Now()
	var comment domain.Comment
	err := s.tx.Within(ctx, func(repos repository.Repositories) error {
		session, err := s.openSession(ctx, repos, comparison)
		if err != nil {
			return err
		}
		comment = domain.NewComment(s.runtime.NewID(), session.ID, draft, snapshot, now)
		return repos.Comments.Insert(ctx, comment)
	})
	return comment, err
}

func (s *CommentService) Update(ctx context.Context, id, body string) (domain.Comment, error) {
	if err := domain.ValidateBody(body); err != nil {
		return domain.Comment{}, err
	}
	if err := s.reads.Comments.UpdateBody(ctx, id, body, s.runtime.Now()); err != nil {
		return domain.Comment{}, err
	}
	return s.reads.Comments.Get(ctx, id)
}

func (s *CommentService) Delete(ctx context.Context, id string) error {
	return s.reads.Comments.Delete(ctx, id)
}

func (s *CommentService) openSession(ctx context.Context, repos repository.Repositories, comparison domain.Comparison) (domain.Session, error) {
	session, err := repos.Sessions.FindOpen(ctx, comparison)
	if !errors.Is(err, domain.ErrNotFound) {
		return session, err
	}
	session = domain.NewSession(s.runtime.NewID(), comparison, s.runtime.Now())
	return session, repos.Sessions.Insert(ctx, session)
}

func (s *CommentService) commentedBlob(ctx context.Context, comparison domain.Comparison, draft domain.CommentDraft) domain.Blob {
	blob, err := s.git.Contents(ctx, comparison, draft.FilePath, draft.Range.EndSide.FileSide())
	if err != nil {
		slog.Warn("comment snapshot unavailable", "path", draft.FilePath, "error", err)
		return nil
	}
	return blob
}
