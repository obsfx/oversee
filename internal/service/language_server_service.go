package service

import (
	"context"
	"fmt"

	"github.com/obsfx/oversee/internal/catalog"
	"github.com/obsfx/oversee/internal/domain"
)

type LanguageServerService struct {
	catalog   catalog.Catalog
	platform  catalog.Platform
	installer ServerInstaller
	installs  InstallationStore
	toolchain RequirementProbe
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

func NewLanguageServerService(servers catalog.Catalog, platform catalog.Platform, installer ServerInstaller, installs InstallationStore, toolchain RequirementProbe) *LanguageServerService {
	service := &LanguageServerService{
		catalog:   servers,
		platform:  platform,
		installer: installer,
		installs:  installs,
		toolchain: toolchain,
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

func (s *LanguageServerService) Install(ctx context.Context, id string) (LanguageServerEntry, error) {
	server, err := s.server(id)
	if err != nil {
		return LanguageServerEntry{}, err
	}
	entry, err := s.entry(server)
	if err != nil {
		return LanguageServerEntry{}, err
	}
	if entry.State.Status() == domain.LanguageServerInstalled && !entry.State.UpdateAvailable() {
		return entry, nil
	}
	if err := entry.State.Installable(); err != nil {
		return LanguageServerEntry{}, err
	}
	s.jobs.start(id, func(ctx context.Context) error {
		return s.installer.Install(ctx, server, s.platform)
	})
	return s.entry(server)
}

func (s *LanguageServerService) Uninstall(ctx context.Context, id string) error {
	if _, err := s.server(id); err != nil {
		return err
	}
	if installing, _ := s.jobs.state(id); installing {
		return fmt.Errorf("%w: %s", domain.ErrLanguageServerBusy, id)
	}
	if err := s.installs.Remove(id); err != nil {
		return err
	}
	s.jobs.clearFailure(id)
	s.notify()
	return nil
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

func (s *LanguageServerService) server(id string) (catalog.Server, error) {
	for _, server := range s.catalog.Servers {
		if server.ID == id {
			return server, nil
		}
	}
	return catalog.Server{}, fmt.Errorf("language server %s: %w", id, domain.ErrNotFound)
}

func (s *LanguageServerService) entry(server catalog.Server) (LanguageServerEntry, error) {
	installed, err := s.installs.InstalledVersion(server.ID)
	if err != nil {
		return LanguageServerEntry{}, err
	}
	installing, failure := s.jobs.state(server.ID)
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
			Failure:          failure,
			Available:        s.availableOnPlatform(server),
			Missing:          missing,
		},
	}, nil
}

func (s *LanguageServerService) availableOnPlatform(server catalog.Server) bool {
	if s.platform == "" {
		return false
	}
	if server.Install.Type != catalog.InstallDownload {
		return true
	}
	_, ok := server.Install.Platforms[s.platform]
	return ok
}

func (s *LanguageServerService) notify() {
	select {
	case s.changed <- struct{}{}:
	default:
	}
}
