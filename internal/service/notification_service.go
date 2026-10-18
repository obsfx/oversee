package service

import (
	"context"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/repository"
)

type NotificationService struct {
	tx      Transactor
	reads   repository.Repositories
	runtime Runtime
}

func NewNotificationService(tx Transactor, reads repository.Repositories, runtime Runtime) *NotificationService {
	return &NotificationService{tx: tx, reads: reads, runtime: runtime}
}

func (s *NotificationService) List(ctx context.Context) ([]domain.Notification, error) {
	return s.reads.Notifications.List(ctx)
}

func (s *NotificationService) MarkRead(ctx context.Context, ids []int64) error {
	if len(ids) == 0 {
		return nil
	}
	now := s.runtime.Now()
	return s.tx.Within(ctx, func(repos repository.Repositories) error {
		if err := repos.Notifications.MarkRead(ctx, ids, now); err != nil {
			return err
		}
		return repos.Events.Append(ctx, domain.NotificationsRead{IDs: ids, At: now})
	})
}
