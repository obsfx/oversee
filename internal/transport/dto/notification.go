package dto

import "github.com/obsfx/oversee/internal/domain"

type Notification struct {
	ID        int64  `json:"id"`
	Kind      string `json:"kind"`
	SessionID string `json:"sessionId"`
	Source    string `json:"source"`
	Target    string `json:"target"`
	Status    string `json:"status,omitempty"`
	CommentID string `json:"commentId,omitempty"`
	FilePath  string `json:"filePath,omitempty"`
	Line      int    `json:"line,omitzero"`
	CreatedAt int64  `json:"createdAt"`
	ReadAt    int64  `json:"readAt,omitzero"`
}

func NotificationOf(notification domain.Notification) Notification {
	return Notification{
		ID:        notification.ID,
		Kind:      string(notification.Kind),
		SessionID: notification.SessionID,
		Source:    notification.Comparison.Source,
		Target:    notification.Comparison.Target,
		Status:    string(notification.Status),
		CommentID: notification.CommentID,
		FilePath:  notification.FilePath,
		Line:      notification.Line,
		CreatedAt: millis(notification.CreatedAt),
		ReadAt:    millis(notification.ReadAt),
	}
}

type NotificationList struct {
	Notifications []Notification `json:"notifications"`
}

func NotificationListOf(notifications []domain.Notification) NotificationList {
	mapped := make([]Notification, 0, len(notifications))
	for _, notification := range notifications {
		mapped = append(mapped, NotificationOf(notification))
	}
	return NotificationList{Notifications: mapped}
}

type ReadNotificationsRequest struct {
	IDs []int64 `json:"ids"`
}
