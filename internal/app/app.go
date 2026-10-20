package app

import (
	"context"
	"net/http"
	"time"

	"github.com/obsfx/oversee/internal/catalog"
	"github.com/obsfx/oversee/internal/git"
	"github.com/obsfx/oversee/internal/langserver"
	"github.com/obsfx/oversee/internal/lsp"
	"github.com/obsfx/oversee/internal/repository"
	"github.com/obsfx/oversee/internal/service"
	"github.com/obsfx/oversee/internal/storage/sqlite"
	"github.com/obsfx/oversee/internal/transport/dto"
	"github.com/obsfx/oversee/internal/transport/httpapi"
	"github.com/obsfx/oversee/internal/workspace"
)

const (
	sessionIdle  = 10 * time.Minute
	sessionRetry = 15 * time.Second
)

type App struct {
	Workspace workspace.Workspace
	Services  service.Services
	db        *sqlite.DB
	git       *git.Repository
	sessions  *lsp.Pool
}

func Init(ctx context.Context, dir string) (workspace.Workspace, bool, error) {
	ws, err := workspace.Resolve(ctx, dir)
	if err != nil {
		return ws, false, err
	}
	created, err := ws.Init(ctx)
	if err != nil {
		return ws, false, err
	}
	db, err := sqlite.Open(ctx, ws.DBPath())
	if err != nil {
		return ws, false, err
	}
	return ws, created, db.Close()
}

func Open(ctx context.Context, dir string) (*App, error) {
	ws, err := workspace.Resolve(ctx, dir)
	if err != nil {
		return nil, err
	}
	if err := ws.RequireInitialized(); err != nil {
		return nil, err
	}
	db, err := sqlite.Open(ctx, ws.DBPath())
	if err != nil {
		return nil, err
	}
	gitRepository := git.NewRepository(ws.RepoRoot, ws.GitDir)
	return &App{Workspace: ws, Services: newServices(db, gitRepository), db: db, git: gitRepository}, nil
}

func newServices(db *sqlite.DB, gitRepository *git.Repository) service.Services {
	codec := dto.EventCodec{}
	reads := repository.New(db, codec)
	tx := repository.NewTxRunner(db, codec)
	runtime := service.DefaultRuntime()
	comments := service.NewCommentService(tx, reads, gitRepository, runtime)
	return service.Services{
		Diffs:         service.NewDiffService(gitRepository),
		Comments:      comments,
		Reviews:       service.NewReviewService(tx, reads, runtime),
		Notifications: service.NewNotificationService(tx, reads, runtime),
		Settings:      service.NewSettingsService(tx, reads, runtime),
		Events: service.NewEventFeed(reads, func(ctx context.Context) (service.ChangeDetector, error) {
			return db.NewChangeDetector(ctx)
		}),
		Watcher: service.NewWorkspaceWatcher(gitRepository, comments),
	}
}

func (a *App) Server(dev bool) (*httpapi.Server, error) {
	if err := a.openLanguageServers(); err != nil {
		return nil, err
	}
	return httpapi.New(httpapi.Config{Services: a.Services, Workspace: a.Workspace.Info(), Dev: dev}), nil
}

func (a *App) openLanguageServers() error {
	servers, err := catalog.Embedded()
	if err != nil {
		return err
	}
	home, err := langserver.ResolveHome()
	if err != nil {
		return err
	}
	platform := langserver.DetectPlatform()
	toolchain := langserver.Toolchain{}
	installations := langserver.NewInstallations(home)
	a.sessions = lsp.NewPool(sessionIdle, sessionRetry)
	installer := langserver.NewInstaller(home, toolchain, &http.Client{})
	a.Services.LanguageServers = service.NewLanguageServerService(servers, platform, installer, installations, toolchain, a.sessions)
	launcher := langserver.NewLauncher(home, toolchain)
	project := langserver.NewProject(a.Workspace.RepoRoot)
	a.Services.Definitions = service.NewDefinitionService(servers, a.git, installations, launcher, project, a.sessions)
	a.Services.Watcher.Listen(a.Services.Definitions)
	return nil
}

func (a *App) Close() error {
	if a.Services.LanguageServers != nil {
		a.Services.LanguageServers.Close()
	}
	if a.sessions != nil {
		a.sessions.Close()
	}
	return a.db.Close()
}
