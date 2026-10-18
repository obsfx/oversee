package repository

import (
	"context"
	"database/sql"
	"strconv"
	"time"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/storage/sqlite/sqldb"
)

const notificationEntity = "notification"

type NotificationRepository struct {
	queries *sqldb.Queries
}

func (r NotificationRepository) Create(ctx context.Context, notification domain.Notification) (domain.Notification, error) {
	id, err := r.queries.InsertNotification(ctx, sqldb.InsertNotificationParams{
		Kind:      string(notification.Kind),
		SessionID: notification.SessionID,
		CommentID: optionalString(notification.CommentID),
		Status:    optionalString(string(notification.Status)),
		CreatedAt: millis(notification.CreatedAt),
	})
	if err != nil {
		return domain.Notification{}, err
	}
	row, err := r.queries.GetNotification(ctx, id)
	if err != nil {
		return domain.Notification{}, notFound(notificationEntity, strconv.FormatInt(id, 10), err)
	}
	return notificationOf(sqldb.ListNotificationsRow(row)), nil
}

func (r NotificationRepository) List(ctx context.Context) ([]domain.Notification, error) {
	rows, err := r.queries.ListNotifications(ctx)
	if err != nil {
		return nil, err
	}
	notifications := make([]domain.Notification, 0, len(rows))
	for _, row := range rows {
		notifications = append(notifications, notificationOf(row))
	}
	return notifications, nil
}

func (r NotificationRepository) MarkRead(ctx context.Context, ids []int64, at time.Time) error {
	return r.queries.MarkNotificationsRead(ctx, sqldb.MarkNotificationsReadParams{
		ReadAt: sql.NullInt64{Int64: millis(at), Valid: true},
		Ids:    ids,
	})
}

func notificationOf(row sqldb.ListNotificationsRow) domain.Notification {
	return domain.Notification{
		ID:         row.ID,
		Kind:       domain.NotificationKind(row.Kind),
		SessionID:  row.SessionID,
		Comparison: domain.Comparison{Source: row.Source, Target: row.Target},
		Status:     domain.Status(row.Status.String),
		CommentID:  row.CommentID.String,
		FilePath:   row.FilePath.String,
		Line:       int(row.StartLine.Int64),
		CreatedAt:  timeOf(row.CreatedAt),
		ReadAt:     optionalTime(row.ReadAt),
	}
}

func optionalString(value string) sql.NullString {
	return sql.NullString{String: value, Valid: value != ""}
}
