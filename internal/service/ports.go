package service

import (
	"context"
	"time"
	"uuid"

	"github.com/obsfx/oversee/internal/catalog"
	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/langserver"
	"github.com/obsfx/oversee/internal/lsp"
	"github.com/obsfx/oversee/internal/repository"
)

type GitReader interface {
	Branches(ctx context.Context) (domain.BranchList, error)
	Tree(ctx context.Context, comparison domain.Comparison) (domain.FileTree, error)
	Contents(ctx context.Context, comparison domain.Comparison, path string, side domain.FileSide) (domain.Blob, error)
}

type Transactor interface {
	Within(ctx context.Context, work func(repos repository.Repositories) error) error
}

type ChangeDetector interface {
	Changed(ctx context.Context) (bool, error)
	Close() error
}

type WorkspaceProbe interface {
	Fingerprint(ctx context.Context) (domain.WorkspaceFingerprint, error)
}

type Audience interface {
	HasClients() bool
}

type Reconciler interface {
	Reconcile(ctx context.Context, change domain.WorkspaceChange) error
}

type ServerInstaller interface {
	Install(ctx context.Context, server catalog.Server, platform catalog.Platform, progress func(domain.InstallProgress)) error
}

type InstallationStore interface {
	InstalledVersion(id string) (string, error)
	Remove(id string) error
	KeepOnly(id, version string) error
}

type RequirementProbe interface {
	Missing(requirements []catalog.Requirement) []catalog.Requirement
}

type DefinitionGit interface {
	Branches(ctx context.Context) (domain.BranchList, error)
	Contents(ctx context.Context, comparison domain.Comparison, path string, side domain.FileSide) (domain.Blob, error)
	ChangedPaths(ctx context.Context, from, to string) ([]string, error)
}

type WorkspaceListener interface {
	WorkspaceChanged(ctx context.Context, change domain.WorkspaceChange)
}

type InstallationFinder interface {
	Find(id string) (langserver.Installation, bool, error)
}

type ServerLauncher interface {
	Start(ctx context.Context, installation langserver.Installation, run catalog.Run, root string) (*langserver.Process, error)
}

type ProjectFiles interface {
	Path(relative string) string
	RootOf(file string, markers []string) string
	Relative(file string) (string, bool)
	Exists(file string) bool
	Read(file string) domain.Blob
}

type SessionStopper interface {
	Stop(prefix string)
}

type SessionPool interface {
	Client(ctx context.Context, launch lsp.Launch) (*lsp.Client, error)
	FilesChanged(events []lsp.FileEvent)
	SessionStopper
}

type Runtime struct {
	Now   func() time.Time
	NewID func() string
}

func DefaultRuntime() Runtime {
	return Runtime{
		Now: time.Now,
		NewID: func() string {
			return uuid.NewV7().String()
		},
	}
}
