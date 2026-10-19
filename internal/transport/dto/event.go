package dto

import (
	"encoding/json/jsontext"
	"encoding/json/v2"
	"fmt"
	"time"

	"github.com/obsfx/oversee/internal/domain"
)

type sessionEventPayload struct {
	SessionID  string     `json:"sessionId"`
	Comparison Comparison `json:"comparison"`
	Status     string     `json:"status"`
}

type replyEventPayload struct {
	SessionID  string     `json:"sessionId"`
	Comparison Comparison `json:"comparison"`
	Reply      Reply      `json:"reply"`
}

type notificationEventPayload struct {
	Notification Notification `json:"notification"`
}

type notificationsReadPayload struct {
	IDs []int64 `json:"ids"`
}

type commentsReconciledPayload struct {
	SessionID  string     `json:"sessionId"`
	Comparison Comparison `json:"comparison"`
}

type EventCodec struct{}

func (EventCodec) Encode(event domain.Event) ([]byte, error) {
	switch typed := event.(type) {
	case domain.SessionFinished:
		return json.Marshal(sessionEventPayload{SessionID: typed.SessionID, Comparison: ComparisonOf(typed.Comparison), Status: string(typed.Status)})
	case domain.SessionStatusChanged:
		return json.Marshal(sessionEventPayload{SessionID: typed.SessionID, Comparison: ComparisonOf(typed.Comparison), Status: string(typed.Status)})
	case domain.CommentReplied:
		return json.Marshal(replyEventPayload{SessionID: typed.SessionID, Comparison: ComparisonOf(typed.Comparison), Reply: ReplyOf(typed.Reply)})
	case domain.NotificationCreated:
		return json.Marshal(notificationEventPayload{Notification: NotificationOf(typed.Notification)})
	case domain.NotificationsRead:
		return json.Marshal(notificationsReadPayload{IDs: typed.IDs})
	case domain.CommentsReconciled:
		return json.Marshal(commentsReconciledPayload{SessionID: typed.SessionID, Comparison: ComparisonOf(typed.Comparison)})
	default:
		return nil, fmt.Errorf("no payload encoding for event %s", event.Kind())
	}
}

type Envelope struct {
	ID        int64          `json:"id,omitzero"`
	Kind      string         `json:"kind"`
	Payload   jsontext.Value `json:"payload"`
	CreatedAt int64          `json:"createdAt"`
}

func EnvelopeOf(event domain.RecordedEvent) Envelope {
	return Envelope{ID: event.ID, Kind: string(event.Kind), Payload: jsontext.Value(event.Payload), CreatedAt: millis(event.CreatedAt)}
}

func (e Envelope) Replayable() bool {
	return e.ID > 0
}

const workspaceChangedKind = "workspace.changed"

type workspaceChangedPayload struct {
	Paths []string `json:"paths"`
	Refs  bool     `json:"refs"`
}

func WorkspaceChangedOf(change domain.WorkspaceChange, at time.Time) (Envelope, error) {
	payload, err := json.Marshal(workspaceChangedPayload{Paths: change.Paths, Refs: change.RefsChanged})
	if err != nil {
		return Envelope{}, err
	}
	return Envelope{Kind: workspaceChangedKind, Payload: jsontext.Value(payload), CreatedAt: millis(at)}, nil
}
