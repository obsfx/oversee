package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/repository"
)

type ReviewService struct {
	tx      Transactor
	reads   repository.Repositories
	runtime Runtime
}

func NewReviewService(tx Transactor, reads repository.Repositories, runtime Runtime) *ReviewService {
	return &ReviewService{tx: tx, reads: reads, runtime: runtime}
}

func (s *ReviewService) FinishedFor(ctx context.Context, comparison domain.Comparison) ([]domain.SessionDetail, error) {
	if err := comparison.Validate(); err != nil {
		return nil, err
	}
	sessions, err := s.reads.Sessions.ListFinishedByComparison(ctx, comparison)
	if err != nil {
		return nil, err
	}
	details := make([]domain.SessionDetail, 0, len(sessions))
	for _, session := range sessions {
		detail, err := s.detailOf(ctx, s.reads, session)
		if err != nil {
			return nil, err
		}
		details = append(details, detail)
	}
	return details, nil
}

func (s *ReviewService) Detail(ctx context.Context, id string) (domain.SessionDetail, error) {
	session, err := finishedSession(ctx, s.reads, id)
	if err != nil {
		return domain.SessionDetail{}, err
	}
	return s.detailOf(ctx, s.reads, session)
}

func (s *ReviewService) List(ctx context.Context, request domain.PageRequest) (domain.SessionPage, error) {
	if err := request.Validate(); err != nil {
		return domain.SessionPage{}, err
	}
	total, err := s.reads.Sessions.CountFinished(ctx)
	if err != nil {
		return domain.SessionPage{}, err
	}
	sessions, err := s.reads.Sessions.ListFinished(ctx, request)
	if err != nil {
		return domain.SessionPage{}, err
	}
	return domain.SessionPage{PageRequest: request, Sessions: sessions, Total: total}, nil
}

func (s *ReviewService) Finish(ctx context.Context, comparison domain.Comparison) (domain.SessionDetail, error) {
	if err := comparison.Validate(); err != nil {
		return domain.SessionDetail{}, err
	}
	var sessionID string
	err := s.tx.Within(ctx, func(repos repository.Repositories) error {
		session, err := repos.Sessions.FindOpen(ctx, comparison)
		if errors.Is(err, domain.ErrNotFound) {
			return domain.ErrNoOpenSession
		}
		if err != nil {
			return err
		}
		finished, err := session.Finish(s.runtime.Now())
		if err != nil {
			return err
		}
		sessionID = session.ID
		if err := repos.Sessions.SaveFinished(ctx, session); err != nil {
			return err
		}
		return repos.Events.Append(ctx, finished)
	})
	if err != nil {
		return domain.SessionDetail{}, err
	}
	return s.Detail(ctx, sessionID)
}

func (s *ReviewService) ChangeStatus(ctx context.Context, id string, to domain.Status) (domain.Session, bool, error) {
	var session domain.Session
	changed := false
	err := s.tx.Within(ctx, func(repos repository.Repositories) error {
		found, err := finishedSession(ctx, repos, id)
		if err != nil {
			return err
		}
		session = found
		change, ok, err := session.ChangeStatus(to, s.runtime.Now())
		if err != nil || !ok {
			return err
		}
		changed = true
		if err := repos.Sessions.SaveStatus(ctx, session, change.At); err != nil {
			return err
		}
		notification, err := repos.Notifications.Create(ctx, domain.NewStatusNotification(change))
		if err != nil {
			return err
		}
		return repos.Events.Append(ctx, change, domain.NotificationCreated{Notification: notification})
	})
	return session, changed, err
}

func (s *ReviewService) Reply(ctx context.Context, draft domain.ReplyDraft) (domain.Reply, error) {
	if err := draft.Validate(); err != nil {
		return domain.Reply{}, err
	}
	var reply domain.Reply
	err := s.tx.Within(ctx, func(repos repository.Repositories) error {
		comment, err := repos.Comments.Get(ctx, draft.CommentID)
		if err != nil {
			return err
		}
		session, err := repos.Sessions.Get(ctx, comment.SessionID)
		if err != nil {
			return err
		}
		if !session.IsFinished() {
			return fmt.Errorf("comment %s is not in a finished review session: %w", comment.ID, domain.ErrNotFound)
		}
		reply = domain.NewReply(s.runtime.NewID(), draft, s.runtime.Now())
		if err := repos.Replies.Insert(ctx, reply); err != nil {
			return err
		}
		replied := domain.CommentReplied{SessionID: session.ID, Comparison: session.Comparison, Reply: reply}
		notification, err := repos.Notifications.Create(ctx, domain.NewReplyNotification(replied))
		if err != nil {
			return err
		}
		return repos.Events.Append(ctx, replied, domain.NotificationCreated{Notification: notification})
	})
	return reply, err
}

func (s *ReviewService) detailOf(ctx context.Context, repos repository.Repositories, session domain.Session) (domain.SessionDetail, error) {
	comments, err := repos.Comments.ListBySession(ctx, session.ID)
	if err != nil {
		return domain.SessionDetail{}, err
	}
	replies, err := repos.Replies.ListBySession(ctx, session.ID)
	if err != nil {
		return domain.SessionDetail{}, err
	}
	return domain.NewSessionDetail(session, comments, replies), nil
}

func finishedSession(ctx context.Context, repos repository.Repositories, id string) (domain.Session, error) {
	session, err := repos.Sessions.Get(ctx, id)
	if err != nil {
		return domain.Session{}, err
	}
	if !session.IsFinished() {
		return domain.Session{}, fmt.Errorf("finished review session %s: %w", id, domain.ErrNotFound)
	}
	return session, nil
}
