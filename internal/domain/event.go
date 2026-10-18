package domain

import "time"

type EventKind string

const (
	EventSessionFinished     EventKind = "session.finished"
	EventSessionStatus       EventKind = "session.status"
	EventCommentReplied      EventKind = "comment.replied"
	EventNotificationCreated EventKind = "notification.created"
	EventNotificationsRead   EventKind = "notifications.read"
)

type Event interface {
	Kind() EventKind
	OccurredAt() time.Time
}

type SessionFinished struct {
	SessionID  string
	Comparison Comparison
	Status     Status
	At         time.Time
}

func (e SessionFinished) Kind() EventKind {
	return EventSessionFinished
}

func (e SessionFinished) OccurredAt() time.Time {
	return e.At
}

type SessionStatusChanged struct {
	SessionID  string
	Comparison Comparison
	Status     Status
	At         time.Time
}

func (e SessionStatusChanged) Kind() EventKind {
	return EventSessionStatus
}

func (e SessionStatusChanged) OccurredAt() time.Time {
	return e.At
}

type CommentReplied struct {
	SessionID  string
	Comparison Comparison
	Reply      Reply
}

func (e CommentReplied) Kind() EventKind {
	return EventCommentReplied
}

func (e CommentReplied) OccurredAt() time.Time {
	return e.Reply.CreatedAt
}

type NotificationCreated struct {
	Notification Notification
}

func (e NotificationCreated) Kind() EventKind {
	return EventNotificationCreated
}

func (e NotificationCreated) OccurredAt() time.Time {
	return e.Notification.CreatedAt
}

type NotificationsRead struct {
	IDs []int64
	At  time.Time
}

func (e NotificationsRead) Kind() EventKind {
	return EventNotificationsRead
}

func (e NotificationsRead) OccurredAt() time.Time {
	return e.At
}

type RecordedEvent struct {
	ID        int64
	Kind      EventKind
	Payload   []byte
	CreatedAt time.Time
}
