package app

import (
	"context"
	"net/http"
	"time"

	"github.com/obsfx/oversee/internal/catalog"
	"github.com/obsfx/oversee/internal/git"
	"github.com/obsfx/oversee/internal/langserver"
	"github.com/obsfx/oversee/internal/repository"
	"github.com/obsfx/oversee/internal/service"
	"github.com/obsfx/oversee/internal/storage/sqlite"
	"github.com/obsfx/oversee/internal/transport/dto"
	"github.com/obsfx/oversee/internal/transport/httpapi"
	"github.com/obsfx/oversee/internal/workspace"
)

const installTimeout = 15 * time.Minute

type App struct {
	Workspace workspace.Workspace
	Services  service.Services
	db        *sqlite.DB
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
	languageServers, err := newLanguageServerService()
	if err != nil {
		return nil, err
	}
	db, err := sqlite.Open(ctx, ws.DBPath())
	if err != nil {
		return nil, err
	}
	services := newServices(db, git.NewRepository(ws.RepoRoot, ws.GitDir))
	services.LanguageServers = languageServers
	return &App{Workspace: ws, Services: services, db: db}, nil
}

func newLanguageServerService() (*service.LanguageServerService, error) {
	servers, err := catalog.Embedded()
	if err != nil {
		return nil, err
	}
	home, err := langserver.ResolveHome()
	if err != nil {
		return nil, err
	}
	platform, _ := langserver.DetectPlatform()
	toolchain := langserver.Toolchain{}
	installer := langserver.NewInstaller(home, toolchain, &http.Client{Timeout: installTimeout})
	return service.NewLanguageServerService(servers, platform, installer, langserver.NewInstallations(home), toolchain), nil
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

func (a *App) Server(dev bool) *httpapi.Server {
	return httpapi.New(httpapi.Config{Services: a.Services, Workspace: a.Workspace.Info(), Dev: dev})
}

func (a *App) Close() error {
	a.Services.LanguageServers.Close()
	return a.db.Close()
}
