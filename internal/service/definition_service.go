package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"slices"
	"time"

	"github.com/obsfx/oversee/internal/catalog"
	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/langserver"
	"github.com/obsfx/oversee/internal/lsp"
)

const (
	definitionTimeout = 10 * time.Second
	snippetLines      = 12
)

type DefinitionService struct {
	catalog  catalog.Catalog
	git      DefinitionGit
	installs InstallationFinder
	launcher ServerLauncher
	project  ProjectFiles
	sessions SessionPool
}

func NewDefinitionService(servers catalog.Catalog, git DefinitionGit, installs InstallationFinder, launcher ServerLauncher, project ProjectFiles, sessions SessionPool) *DefinitionService {
	return &DefinitionService{catalog: servers, git: git, installs: installs, launcher: launcher, project: project, sessions: sessions}
}

func (s *DefinitionService) Find(ctx context.Context, query domain.DefinitionQuery) (domain.DefinitionLookup, error) {
	if err := query.Validate(); err != nil {
		return domain.DefinitionLookup{}, err
	}
	languageID, ok := s.catalog.FileTypeOf(query.Path)
	if !ok {
		return domain.DefinitionsWith(domain.DefinitionsUnsupported, ""), nil
	}
	server, ok := s.catalog.Server(s.catalog.FileTypes[languageID].Server)
	if !ok {
		return domain.DefinitionLookup{}, fmt.Errorf("language server for %s: %w", languageID, domain.ErrNotFound)
	}
	installation, found, err := s.installs.Find(server.ID)
	if err != nil {
		return domain.DefinitionLookup{}, err
	}
	if !found {
		return domain.DefinitionsWith(domain.DefinitionsNotInstalled, server.ID), nil
	}
	branches, err := s.git.Branches(ctx)
	if err != nil {
		return domain.DefinitionLookup{}, err
	}
	if !query.OnWorkingTree(branches.Current) {
		return domain.DefinitionsWith(domain.DefinitionsNeedsCheckout, server.ID), nil
	}
	content, err := s.git.Contents(ctx, query.Comparison, query.Path, query.Side)
	if err != nil {
		return domain.DefinitionLookup{}, err
	}
	if !content.Exists() {
		return domain.DefinitionLookup{}, fmt.Errorf("file %s on the %s side: %w", query.Path, query.Side, domain.ErrNotFound)
	}
	return s.lookup(ctx, query, server, installation, languageID, content), nil
}

func (s *DefinitionService) WorkspaceChanged(ctx context.Context, change domain.WorkspaceChange) {
	paths := slices.Clone(change.Paths)
	if change.HeadMoved() {
		moved, err := s.git.ChangedPaths(ctx, change.FromHead, change.ToHead)
		if err != nil {
			slog.Warn("changed paths between heads failed, restarting language servers", "error", err)
			s.sessions.Stop("")
			return
		}
		paths = append(paths, moved...)
	}
	slices.Sort(paths)
	events := make([]lsp.FileEvent, 0, len(paths))
	for _, relative := range slices.Compact(paths) {
		file := s.project.Path(relative)
		events = append(events, lsp.FileEventOf(file, s.project.Exists(file)))
	}
	s.sessions.FilesChanged(events)
}

func (s *DefinitionService) lookup(ctx context.Context, query domain.DefinitionQuery, server catalog.Server, installation langserver.Installation, languageID string, content domain.Blob) domain.DefinitionLookup {
	file := s.project.Path(query.Path)
	root := s.project.RootOf(file, server.RootMarkers)
	ctx, cancel := context.WithTimeout(ctx, definitionTimeout)
	defer cancel()
	client, err := s.sessions.Client(ctx, s.launch(server, installation, root))
	if errors.Is(err, lsp.ErrStarting) {
		return domain.DefinitionsWith(domain.DefinitionsStarting, server.ID)
	}
	if err != nil {
		return domain.DefinitionsFailure(server.ID, err)
	}
	document := lsp.Document{Path: file, LanguageID: languageID, Text: string(content)}
	locations, err := client.Definition(ctx, document, lsp.Position{Line: query.Line - 1, Character: query.Character})
	if errors.Is(err, context.DeadlineExceeded) || err == nil && len(locations) == 0 && client.Indexing() {
		return domain.DefinitionsWith(domain.DefinitionsIndexing, server.ID)
	}
	if err != nil {
		return domain.DefinitionsFailure(server.ID, err)
	}
	return domain.DefinitionLookup{Status: domain.DefinitionsReady, Server: server.ID, Definitions: s.definitions(query, content, locations)}
}

func (s *DefinitionService) launch(server catalog.Server, installation langserver.Installation, root string) lsp.Launch {
	return lsp.Launch{
		Key:  sessionKeyPrefix(server.ID) + installation.Version + "\x00" + root,
		Root: root,
		Start: func(ctx context.Context) (lsp.Transport, error) {
			process, err := s.launcher.Start(ctx, installation, server.Run, root)
			if err != nil {
				return nil, err
			}
			return process, nil
		},
	}
}

func (s *DefinitionService) definitions(query domain.DefinitionQuery, content domain.Blob, locations []lsp.Location) []domain.Definition {
	definitions := make([]domain.Definition, 0, len(locations))
	seen := map[lsp.Location]bool{}
	for _, location := range locations {
		file, err := lsp.PathOf(location.URI)
		if err != nil || seen[location] {
			continue
		}
		seen[location] = true
		start := location.Range.Start
		definition := domain.Definition{
			Path:           file,
			External:       true,
			Side:           domain.FileSideNew,
			StartLine:      start.Line + 1,
			StartCharacter: start.Character,
			EndLine:        location.Range.End.Line + 1,
			EndCharacter:   location.Range.End.Character,
		}
		relative, inRepo := s.project.Relative(file)
		if inRepo {
			definition.Path, definition.External = relative, false
		}
		if inRepo && relative == query.Path {
			definition.Side = query.Side
			definition.Snippet = content.Snippet(start.Line, snippetLines)
		} else {
			definition.Snippet = s.project.Read(file).Snippet(start.Line, snippetLines)
		}
		definitions = append(definitions, definition)
	}
	return definitions
}

func sessionKeyPrefix(serverID string) string {
	return serverID + "\x00"
}
