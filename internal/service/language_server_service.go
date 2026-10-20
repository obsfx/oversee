package service

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/obsfx/oversee/internal/catalog"
	"github.com/obsfx/oversee/internal/domain"
)

type LanguageServerService struct {
	catalog   catalog.Catalog
	platform  catalog.Platform
	installer ServerInstaller
	installs  InstallationStore
	toolchain RequirementProbe
	sessions  SessionStopper
	jobs      *installJobs
	changed   chan struct{}
}

type LanguageServerList struct {
	Platform  catalog.Platform
	FileTypes map[string]catalog.FileType
	Servers   []LanguageServerEntry
}

type LanguageServerEntry struct {
	Server catalog.Server
	State  domain.LanguageServerState
}

func NewLanguageServerService(servers catalog.Catalog, platform catalog.Platform, installer ServerInstaller, installs InstallationStore, toolchain RequirementProbe, sessions SessionStopper) *LanguageServerService {
	service := &LanguageServerService{
		catalog:   servers,
		platform:  platform,
		installer: installer,
		installs:  installs,
		toolchain: toolchain,
		sessions:  sessions,
		changed:   make(chan struct{}, 1),
	}
	service.jobs = newInstallJobs(service.notify)
	return service
}

func (s *LanguageServerService) List(ctx context.Context) (LanguageServerList, error) {
	entries := make([]LanguageServerEntry, 0, len(s.catalog.Servers))
	for _, server := range s.catalog.Servers {
		entry, err := s.entry(server)
		if err != nil {
			return LanguageServerList{}, err
		}
		entries = append(entries, entry)
	}
	return LanguageServerList{Platform: s.platform, FileTypes: s.catalog.FileTypes, Servers: entries}, nil
}

func (s *LanguageServerService) Install(ctx context.Context, id string) (LanguageServerEntry, bool, error) {
	server, err := s.server(id)
	if err != nil {
		return LanguageServerEntry{}, false, err
	}
	entry, err := s.entry(server)
	if err != nil {
		return LanguageServerEntry{}, false, err
	}
	if entry.State.Status() == domain.LanguageServerInstalled && !entry.State.UpdateAvailable() {
		return entry, false, nil
	}
	if err := entry.State.Installable(); err != nil {
		return LanguageServerEntry{}, false, err
	}
	started, err := s.jobs.start(id, func(ctx context.Context, report func(domain.InstallProgress)) error {
		return s.install(ctx, server, report)
	})
	if err != nil {
		return LanguageServerEntry{}, false, err
	}
	entry, err = s.entry(server)
	return entry, started, err
}

func (s *LanguageServerService) Cancel(id string) error {
	if _, err := s.server(id); err != nil {
		return err
	}
	s.jobs.cancelInstall(id)
	return nil
}

func (s *LanguageServerService) Uninstall(ctx context.Context, id string) error {
	if _, err := s.server(id); err != nil {
		return err
	}
	return s.jobs.exclusive(id, func() error {
		s.sessions.Stop(sessionKeyPrefix(id))
		err := s.installs.Remove(id)
		s.sessions.Stop(sessionKeyPrefix(id))
		return err
	})
}

func (s *LanguageServerService) Follow(ctx context.Context, publish func()) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-s.changed:
			publish()
		}
	}
}

func (s *LanguageServerService) Close() {
	s.jobs.close()
}

func (s *LanguageServerService) install(ctx context.Context, server catalog.Server, report func(domain.InstallProgress)) error {
	if err := s.installer.Install(ctx, server, s.platform, report); err != nil {
		return err
	}
	s.sessions.Stop(sessionKeyPrefix(server.ID))
	if err := s.installs.KeepOnly(server.ID, server.Version); err != nil {
		slog.Warn("language server cleanup failed", "server", server.ID, "error", err)
	}
	s.sessions.Stop(sessionKeyPrefix(server.ID))
	return nil
}

func (s *LanguageServerService) server(id string) (catalog.Server, error) {
	server, ok := s.catalog.Server(id)
	if !ok {
		return catalog.Server{}, fmt.Errorf("language server %s: %w", id, domain.ErrNotFound)
	}
	return server, nil
}

func (s *LanguageServerService) entry(server catalog.Server) (LanguageServerEntry, error) {
	installed, err := s.installs.InstalledVersion(server.ID)
	if err != nil {
		return LanguageServerEntry{}, err
	}
	installing, failure, progress := s.jobs.state(server.ID)
	missing := make([]string, 0, len(server.Requires))
	for _, requirement := range s.toolchain.Missing(server.Requires) {
		missing = append(missing, string(requirement))
	}
	return LanguageServerEntry{
		Server: server,
		State: domain.LanguageServerState{
			ID:               server.ID,
			CatalogVersion:   server.Version,
			InstalledVersion: installed,
			Installing:       installing,
			Progress:         progress,
			Failure:          failure,
			Available:        server.Install.AvailableOn(s.platform),
			Missing:          missing,
		},
	}, nil
}

func (s *LanguageServerService) notify() {
	select {
	case s.changed <- struct{}{}:
	default:
	}
}
