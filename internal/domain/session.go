package domain

import (
	"slices"
	"time"
)

type Status string

const (
	StatusCreated    Status = "created"
	StatusInProgress Status = "in-progress"
	StatusClosed     Status = "closed"
)

var statuses = []Status{StatusCreated, StatusInProgress, StatusClosed}

func (s Status) Validate() error {
	if !slices.Contains(statuses, s) {
		return invalid("status", "must be created, in-progress or closed")
	}
	return nil
}

type Session struct {
	ID           string
	Comparison   Comparison
	Status       Status
	CreatedAt    time.Time
	FinishedAt   time.Time
	CommentCount int
}

func NewSession(id string, comparison Comparison, at time.Time) Session {
	return Session{ID: id, Comparison: comparison, Status: StatusCreated, CreatedAt: at}
}

func (s Session) IsFinished() bool {
	return !s.FinishedAt.IsZero()
}

func (s *Session) Finish(at time.Time) (SessionFinished, error) {
	if s.IsFinished() {
		return SessionFinished{}, ErrSessionFinished
	}
	s.FinishedAt = at
	s.Status = StatusCreated
	return SessionFinished{SessionID: s.ID, Comparison: s.Comparison, Status: s.Status, At: at}, nil
}

func (s *Session) ChangeStatus(to Status, at time.Time) (SessionStatusChanged, bool, error) {
	if err := to.Validate(); err != nil {
		return SessionStatusChanged{}, false, err
	}
	if !s.IsFinished() {
		return SessionStatusChanged{}, false, ErrSessionNotFinished
	}
	if s.Status == to {
		return SessionStatusChanged{}, false, nil
	}
	s.Status = to
	return SessionStatusChanged{SessionID: s.ID, Comparison: s.Comparison, Status: to, At: at}, true, nil
}

type CommentThread struct {
	Comment
	Replies []Reply
}

type SessionDetail struct {
	Session
	Threads []CommentThread
}

func NewSessionDetail(session Session, comments []Comment, replies []Reply) SessionDetail {
	byComment := map[string][]Reply{}
	for _, reply := range replies {
		byComment[reply.CommentID] = append(byComment[reply.CommentID], reply)
	}
	threads := make([]CommentThread, 0, len(comments))
	for _, comment := range comments {
		threads = append(threads, CommentThread{Comment: comment, Replies: byComment[comment.ID]})
	}
	return SessionDetail{Session: session, Threads: threads}
}

type PageRequest struct {
	Page  int
	Limit int
}

func (p PageRequest) Validate() error {
	if p.Page < 1 {
		return invalid("page", "must be 1 or greater")
	}
	if p.Limit < 1 {
		return invalid("limit", "must be 1 or greater")
	}
	return nil
}

func (p PageRequest) Offset() int {
	return (p.Page - 1) * p.Limit
}

type SessionPage struct {
	PageRequest
	Sessions []Session
	Total    int
}

func (p SessionPage) PageCount() int {
	return max(1, (p.Total+p.Limit-1)/p.Limit)
}
