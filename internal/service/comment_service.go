package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"slices"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/repository"
)

type commentBlobKey struct {
	path string
	side domain.FileSide
}

type commentMove struct {
	moved domain.Comment
	from  domain.LineRange
}

type commentReconciliation struct {
	moves    []commentMove
	outdated []string
}

func (r *commentReconciliation) add(comment domain.Comment, placement domain.Placement) {
	switch placement.Kind {
	case domain.PlacementOutdated:
		r.outdated = append(r.outdated, comment.ID)
	case domain.PlacementMoved:
		r.moves = append(r.moves, commentMove{moved: placement.Moved, from: comment.Range})
	}
}

func (r *commentReconciliation) outdate(comments []domain.Comment) {
	for _, comment := range comments {
		r.outdated = append(r.outdated, comment.ID)
	}
}

func (r commentReconciliation) isEmpty() bool {
	return len(r.moves) == 0 && len(r.outdated) == 0
}

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
	blob, readable, err := s.commentedBlob(ctx, comparison, draft)
	if err != nil {
		return domain.Comment{}, err
	}
	snapshot := draft.Range.Snapshot(blob)
	if readable {
		if err := draft.CheckFresh(snapshot); err != nil {
			return domain.Comment{}, err
		}
	}
	now := s.runtime.Now()
	var comment domain.Comment
	err = s.tx.Within(ctx, func(repos repository.Repositories) error {
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

func (s *CommentService) Reconcile(ctx context.Context, change domain.WorkspaceChange) error {
	sessions, err := s.reads.Sessions.ListOpen(ctx)
	if err != nil {
		return err
	}
	var failures []error
	for _, session := range sessions {
		if err := s.reconcileSession(ctx, session, change); err != nil {
			failures = append(failures, fmt.Errorf("reconcile review session %s: %w", session.ID, err))
		}
	}
	return errors.Join(failures...)
}

func (s *CommentService) reconcileSession(ctx context.Context, session domain.Session, change domain.WorkspaceChange) error {
	comments, err := s.reads.Comments.ListBySession(ctx, session.ID)
	if err != nil {
		return err
	}
	touched := slices.DeleteFunc(comments, func(comment domain.Comment) bool {
		return comment.IsOutdated() || !change.Touches(session.Comparison, comment.FilePath)
	})
	if len(touched) == 0 {
		return nil
	}
	result := commentReconciliation{}
	tree, err := s.git.Tree(ctx, session.Comparison)
	if errors.Is(err, domain.ErrUnknownBranch) {
		result.outdate(touched)
		return s.applyReconciliation(ctx, session, result)
	}
	if err != nil {
		return err
	}
	blobs := map[commentBlobKey]domain.Blob{}
	for _, comment := range touched {
		placement := domain.Placement{Kind: domain.PlacementOutdated}
		if fileChange, inDiff := tree.Find(comment.FilePath); inDiff {
			blob, err := s.reconcileBlob(ctx, session.Comparison, comment, fileChange.File(), blobs)
			if err != nil {
				return err
			}
			placement = comment.Place(blob)
		}
		result.add(comment, placement)
	}
	return s.applyReconciliation(ctx, session, result)
}

func (s *CommentService) reconcileBlob(ctx context.Context, comparison domain.Comparison, comment domain.Comment, file domain.FileRef, cache map[commentBlobKey]domain.Blob) (domain.Blob, error) {
	key := commentBlobKey{path: file.SnapshotPath(comment.Range), side: comment.Range.SnapshotSide()}
	if blob, cached := cache[key]; cached {
		return blob, nil
	}
	blob, err := s.git.Contents(ctx, comparison, key.path, key.side)
	if err != nil {
		return nil, err
	}
	cache[key] = blob
	return blob, nil
}

func (s *CommentService) applyReconciliation(ctx context.Context, session domain.Session, result commentReconciliation) error {
	if result.isEmpty() {
		return nil
	}
	now := s.runtime.Now()
	return s.tx.Within(ctx, func(repos repository.Repositories) error {
		changed := false
		for _, move := range result.moves {
			moved, err := repos.Comments.Move(ctx, move.moved, move.from)
			if err != nil {
				return err
			}
			changed = changed || moved
		}
		for _, id := range result.outdated {
			marked, err := repos.Comments.MarkOutdated(ctx, id, now)
			if err != nil {
				return err
			}
			changed = changed || marked
		}
		if !changed {
			return nil
		}
		return repos.Events.Append(ctx, domain.CommentsReconciled{SessionID: session.ID, Comparison: session.Comparison, At: now})
	})
}

func (s *CommentService) openSession(ctx context.Context, repos repository.Repositories, comparison domain.Comparison) (domain.Session, error) {
	session, err := repos.Sessions.FindOpen(ctx, comparison)
	if !errors.Is(err, domain.ErrNotFound) {
		return session, err
	}
	session = domain.NewSession(s.runtime.NewID(), comparison, s.runtime.Now())
	return session, repos.Sessions.Insert(ctx, session)
}

func (s *CommentService) commentedBlob(ctx context.Context, comparison domain.Comparison, draft domain.CommentDraft) (domain.Blob, bool, error) {
	path := draft.File().SnapshotPath(draft.Range)
	blob, err := s.git.Contents(ctx, comparison, path, draft.Range.SnapshotSide())
	if errors.Is(err, domain.ErrUnknownBranch) {
		return nil, false, err
	}
	if err != nil {
		slog.Warn("comment snapshot unavailable", "path", path, "error", err)
		return nil, false, nil
	}
	return blob, true, nil
}
