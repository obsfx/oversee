package service

type Services struct {
	Diffs         *DiffService
	Comments      *CommentService
	Reviews       *ReviewService
	Notifications *NotificationService
	Events        *EventFeed
	Watcher       *WorkspaceWatcher
}
