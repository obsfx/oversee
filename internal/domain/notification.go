package domain

import "time"

type NotificationKind string

const (
	NotificationSessionStatus NotificationKind = "session-status"
	NotificationCommentReply  NotificationKind = "comment-reply"
)

type Notification struct {
	ID         int64
	Kind       NotificationKind
	SessionID  string
	Comparison Comparison
	Status     Status
	CommentID  string
	FilePath   string
	Line       int
	CreatedAt  time.Time
	ReadAt     time.Time
}

func NewStatusNotification(change SessionStatusChanged) Notification {
	return Notification{
		Kind:       NotificationSessionStatus,
		SessionID:  change.SessionID,
		Comparison: change.Comparison,
		Status:     change.Status,
		CreatedAt:  change.At,
	}
}

func NewReplyNotification(replied CommentReplied) Notification {
	return Notification{
		Kind:       NotificationCommentReply,
		SessionID:  replied.SessionID,
		Comparison: replied.Comparison,
		CommentID:  replied.Reply.CommentID,
		CreatedAt:  replied.Reply.CreatedAt,
	}
}

func (n Notification) IsRead() bool {
	return !n.ReadAt.IsZero()
}
