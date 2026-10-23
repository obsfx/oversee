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
	catalog   catalog.Catalog
	git       DefinitionGit
	installs  InstallationFinder
	launcher  ServerLauncher
	project   ProjectFiles
	sessions  SessionPool
	externals externalPaths
}

func NewDefinitionService(servers catalog.Catalog, git DefinitionGit, installs InstallationFinder, launcher ServerLauncher, project ProjectFiles, sessions SessionPool) *DefinitionService {
	return &DefinitionService{catalog: servers, git: git, installs: installs, launcher: launcher, project: project, sessions: sessions}
}

func (s *DefinitionService) Find(ctx context.Context, query domain.DefinitionQuery) (domain.DefinitionLookup, error) {
	if err := query.Validate(); err != nil {
		return domain.DefinitionLookup{}, err
	}
	server, languageID, ok := s.catalog.ServerFor(query.Path)
	if !ok {
		return domain.DefinitionsWith(domain.ServerUnsupported, ""), nil
	}
	installation, found, err := s.installs.Find(server.ID)
	if err != nil {
		return domain.DefinitionLookup{}, err
	}
	if !found {
		return domain.DefinitionsWith(domain.ServerNotInstalled, server.ID), nil
	}
	onDisk, err := onWorkingTree(ctx, s.git.CurrentBranch, query.Comparison)
	if err != nil {
		return domain.DefinitionLookup{}, err
	}
	if !onDisk {
		return domain.DefinitionsWith(domain.ServerNeedsCheckout, server.ID), nil
	}
	content, err := s.git.Contents(ctx, query.Comparison, query.Path, query.Side)
	if err != nil {
		return domain.DefinitionLookup{}, err
	}
	if !content.Exists() {
		return domain.DefinitionLookup{}, fmt.Errorf("file %s on the %s side: %w", query.Path, query.Side, domain.ErrNotFound)
	}
	lookup := s.lookup(ctx, query, server, installation, languageID, content)
	for _, definition := range lookup.Definitions {
		if definition.External {
			s.externals.add(definition.Path)
		}
	}
	return lookup, nil
}

func (s *DefinitionService) FileContent(request domain.FileContentRequest) (domain.FileContent, error) {
	if err := request.Validate(); err != nil {
		return domain.FileContent{}, err
	}
	var content domain.Blob
	var err error
	if request.External {
		if !s.externals.has(request.Path) {
			return domain.FileContent{}, fmt.Errorf("external file %s: %w", request.Path, domain.ErrNotFound)
		}
		content, err = s.project.ReadAbsolute(request.Path)
	} else {
		content, err = s.project.ReadRelative(request.Path)
	}
	if tooLarge, ok := errors.AsType[langserver.FileTooLargeError](err); ok {
		return domain.FileContent{}, request.Reject(fmt.Sprintf("is larger than %d MiB", tooLarge.LimitMiB))
	}
	if err != nil {
		return domain.FileContent{}, err
	}
	if content == nil {
		return domain.FileContent{}, fmt.Errorf("file %s: %w", request.Path, domain.ErrNotFound)
	}
	if content.IsBinary() {
		return domain.FileContent{}, request.Reject("is a binary file")
	}
	return domain.FileContent{Path: request.Path, Contents: content}, nil
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
	bounded, cancel := context.WithTimeout(ctx, definitionTimeout)
	defer cancel()
	client, err := s.sessions.Client(bounded, serverLaunch(s.launcher, server, installation, root))
	if err != nil {
		return domain.DefinitionsUnavailable(server.ID, serverStatusOf(ctx, err), err)
	}
	document := lsp.Document{Path: file, LanguageID: languageID, Text: string(content)}
	locations, err := client.Definition(bounded, document, lsp.Position{Line: query.Line - 1, Character: query.Character})
	if err != nil {
		return domain.DefinitionsUnavailable(server.ID, serverStatusOf(ctx, err), err)
	}
	if len(locations) == 0 && client.Indexing() {
		return domain.DefinitionsWith(domain.ServerIndexing, server.ID)
	}
	return domain.DefinitionLookup{Status: domain.ServerReady, Server: server.ID, Definitions: s.definitions(query, content, locations)}
}

func onWorkingTree(ctx context.Context, currentBranch func(context.Context) (string, error), comparison domain.Comparison) (bool, error) {
	if comparison.IsUncommitted() {
		return true, nil
	}
	current, err := currentBranch(ctx)
	if err != nil {
		return false, err
	}
	return comparison.OnWorkingTree(current), nil
}

func serverStatusOf(ctx context.Context, err error) domain.ServerStatus {
	switch {
	case errors.Is(err, lsp.ErrStarting) && ctx.Err() == nil:
		return domain.ServerStarting
	case ctx.Err() != nil, errors.Is(err, context.DeadlineExceeded), errors.Is(err, context.Canceled), lsp.IsRetryable(err):
		return domain.ServerIndexing
	default:
		return domain.ServerFailed
	}
}

func serverLaunch(launcher ServerLauncher, server catalog.Server, installation langserver.Installation, root string) lsp.Launch {
	return lsp.Launch{
		Key:  sessionKeyPrefix(server.ID) + installation.Version + "\x00" + root,
		Root: root,
		Start: func(ctx context.Context) (lsp.Transport, map[string]any, error) {
			process, initializationOptions, err := launcher.Start(ctx, installation, server.Run, root)
			if err != nil {
				return nil, nil, err
			}
			return process, initializationOptions, nil
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
			Path:     file,
			External: true,
			Side:     domain.FileSideNew,
			Line:     start.Line + 1,
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
