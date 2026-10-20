package service

type Services struct {
	Diffs           *DiffService
	Comments        *CommentService
	Reviews         *ReviewService
	Notifications   *NotificationService
	Settings        *SettingsService
	Events          *EventFeed
	Watcher         *WorkspaceWatcher
	LanguageServers *LanguageServerService
	Definitions     *DefinitionService
}
