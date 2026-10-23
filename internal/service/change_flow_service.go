package service

import (
	"context"
	"errors"
	"maps"
	"path"
	"path/filepath"
	"slices"
	"sync"
	"sync/atomic"
	"time"

	"github.com/obsfx/oversee/internal/catalog"
	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/langserver"
	"github.com/obsfx/oversee/internal/lsp"
)

const (
	flowTimeout    = 5 * time.Minute
	flowWait       = 20 * time.Second
	flowIdle       = 10 * time.Second
	flowGroupLimit = 4
	flowStartWait  = 10 * time.Second
	previousPrefix = ".oversee-previous."
)

var errSuperseded = errors.New("change flow build superseded by a newer one")

type ChangeFlowService struct {
	catalog   catalog.Catalog
	git       FlowGit
	installs  InstallationFinder
	launcher  ServerLauncher
	project   ProjectPaths
	sessions  SessionSource
	godot     GodotAnalyzer
	timeout   time.Duration
	wait      time.Duration
	startWait time.Duration
	clock     clock
	feed      *flowProgressFeed
	ctx       context.Context
	cancel    context.CancelFunc
	group     sync.WaitGroup
	refs      atomic.Uint64
	worktree  atomic.Uint64
	mu        sync.Mutex
	flows     map[domain.Comparison]*comparisonFlow
}

type flowGroup struct {
	server       catalog.Server
	installation langserver.Installation
	root         string
	files        []domain.LineChanges
	tally        flowTally
}

func (g flowGroup) key() string {
	return g.server.ID + "\x00" + g.installation.Version + "\x00" + g.root
}

func NewChangeFlowService(servers catalog.Catalog, git FlowGit, installs InstallationFinder, launcher ServerLauncher, project ProjectPaths, sessions SessionSource, godot GodotAnalyzer) *ChangeFlowService {
	ctx, cancel := context.WithCancel(context.Background())
	return &ChangeFlowService{
		catalog:   servers,
		git:       git,
		installs:  installs,
		launcher:  launcher,
		project:   project,
		sessions:  sessions,
		godot:     godot,
		timeout:   flowTimeout,
		wait:      flowWait,
		startWait: flowStartWait,
		clock:     systemClock{},
		feed:      newFlowProgressFeed(),
		ctx:       ctx,
		cancel:    cancel,
		flows:     map[domain.Comparison]*comparisonFlow{},
	}
}

func (s *ChangeFlowService) Flow(ctx context.Context, comparison domain.Comparison) (domain.FlowGraph, error) {
	if err := comparison.Validate(); err != nil {
		return domain.FlowGraph{}, err
	}
	for {
		build := s.buildFor(comparison)
		graph, err := s.await(ctx, comparison, build)
		if !errors.Is(err, errSuperseded) {
			return graph, err
		}
	}
}

func (s *ChangeFlowService) await(ctx context.Context, comparison domain.Comparison, build *flowBuild) (domain.FlowGraph, error) {
	s.watch(comparison)
	defer s.unwatch(comparison)
	select {
	case <-build.done:
		return s.answer(comparison, build)
	case <-time.After(s.wait):
	case <-ctx.Done():
		return domain.FlowGraph{}, ctx.Err()
	}
	if graph, found := s.interim(comparison, build); found {
		return graph, nil
	}
	select {
	case <-build.grouped:
		return build.pending, nil
	case <-build.done:
		return s.answer(comparison, build)
	case <-ctx.Done():
		return domain.FlowGraph{}, ctx.Err()
	}
}

func (s *ChangeFlowService) answer(comparison domain.Comparison, build *flowBuild) (domain.FlowGraph, error) {
	graph, err := build.result()
	if err != nil {
		return graph, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.flows[comparison].shown(graph), nil
}

func (s *ChangeFlowService) Follow(ctx context.Context, publish func(domain.FlowProgress)) {
	s.feed.follow(ctx, publish)
}

func (s *ChangeFlowService) WorkspaceChanged(_ context.Context, change domain.WorkspaceChange) {
	if change.RefsChanged {
		s.refs.Add(1)
	}
	s.worktree.Add(1)
}

func (s *ChangeFlowService) generationOf(comparison domain.Comparison) flowGeneration {
	generation := flowGeneration{refs: s.refs.Load()}
	if comparison.IsUncommitted() {
		generation.worktree = s.worktree.Load()
	}
	return generation
}

func (s *ChangeFlowService) Close() {
	s.cancel()
	s.group.Wait()
}

func (s *ChangeFlowService) buildFor(comparison domain.Comparison) *flowBuild {
	generation := s.generationOf(comparison)
	installed := s.versionsOf(s.serversOf(comparison))
	s.mu.Lock()
	defer s.mu.Unlock()
	flow := s.flowOf(comparison)
	if newest := flow.newest(); newest != nil && newest.serves(generation, installed) {
		return newest
	}
	build := &flowBuild{generation: generation, grouped: make(chan struct{}), done: make(chan struct{})}
	current := flow.current
	if current != nil && !current.finished() && current.isGrouped() {
		if flow.queued != nil {
			flow.queued.supersede()
		}
		flow.queued = build
		return build
	}
	if current != nil && !current.finished() {
		current.supersede()
	}
	s.start(comparison, flow, build)
	return build
}

func (s *ChangeFlowService) serversOf(comparison domain.Comparison) []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	flow, found := s.flows[comparison]
	if !found || flow.newest() == nil {
		return nil
	}
	return slices.Collect(maps.Keys(flow.newest().installed()))
}

func (s *ChangeFlowService) versionsOf(servers []string) serverVersions {
	versions := serverVersions{}
	for _, server := range servers {
		installation, found, err := s.installs.Find(server)
		if err == nil {
			versions.record(server, installation, found)
		}
	}
	return versions
}

func (s *ChangeFlowService) flowOf(comparison domain.Comparison) *comparisonFlow {
	flow, found := s.flows[comparison]
	if !found {
		flow = &comparisonFlow{reporter: newFlowReporter(comparison, s.clock, s.feed.push)}
		s.flows[comparison] = flow
	}
	return flow
}

func (s *ChangeFlowService) start(comparison domain.Comparison, flow *comparisonFlow, build *flowBuild) {
	flow.kept.reset(build.generation)
	ctx, cancel := context.WithTimeout(s.ctx, s.timeout)
	build.cancel = cancel
	build.started = true
	build.tracker = flow.reporter.begin()
	flow.current = build
	s.group.Go(func() {
		defer cancel()
		graph, err := s.build(ctx, comparison, build)
		build.tracker.finish()
		s.finish(comparison, build, graph, err, ctx.Err() != nil)
	})
}

func (s *ChangeFlowService) finish(comparison domain.Comparison, build *flowBuild, graph domain.FlowGraph, err error, cancelled bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	build.graph, build.err = graph, err
	close(build.done)
	flow := s.flows[comparison]
	if flow.current != build {
		return
	}
	if err == nil && !cancelled && !graph.Tracing() {
		flow.last = build
	}
	if next := flow.queued; next != nil {
		flow.queued = nil
		s.start(comparison, flow, next)
	}
}

func (s *ChangeFlowService) watch(comparison domain.Comparison) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.flows[comparison].waiters++
}

func (s *ChangeFlowService) unwatch(comparison domain.Comparison) {
	s.mu.Lock()
	defer s.mu.Unlock()
	flow := s.flows[comparison]
	flow.waiters--
	flow.waitedAt = time.Now()
	if flow.waiters > 0 {
		return
	}
	if flow.idle != nil {
		flow.idle.Reset(s.idle())
		return
	}
	flow.idle = time.AfterFunc(s.idle(), func() {
		s.abandon(comparison)
	})
}

func (s *ChangeFlowService) idle() time.Duration {
	return s.wait + flowIdle
}

func (s *ChangeFlowService) abandon(comparison domain.Comparison) {
	s.mu.Lock()
	defer s.mu.Unlock()
	flow := s.flows[comparison]
	if flow.waiters == 0 && time.Since(flow.waitedAt) >= s.idle() {
		flow.abandon()
	}
}

func (s *ChangeFlowService) interim(comparison domain.Comparison, build *flowBuild) (domain.FlowGraph, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.flows[comparison].interim(build)
}

func (s *ChangeFlowService) keptFor(comparison domain.Comparison, generation flowGeneration) keptResults {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.flows[comparison].kept.at(generation)
}

func (s *ChangeFlowService) keep(comparison domain.Comparison, generation flowGeneration, group flowGroup, result groupResult) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.flows[comparison].kept.keepGroup(generation, group.key(), result)
}

func (s *ChangeFlowService) keepGodot(comparison domain.Comparison, generation flowGeneration, graph domain.FlowGraph) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.flows[comparison].kept.keepGodot(generation, graph)
}

func (s *ChangeFlowService) build(ctx context.Context, comparison domain.Comparison, build *flowBuild) (domain.FlowGraph, error) {
	files, err := s.git.ChangedLines(ctx, comparison)
	if err != nil {
		return domain.FlowGraph{}, err
	}
	groups, statuses, versions := s.groups(files)
	if len(groups) > 0 {
		onDisk, err := onWorkingTree(ctx, s.git.CurrentBranch, comparison)
		if err != nil {
			return domain.FlowGraph{}, err
		}
		if !onDisk {
			for _, group := range groups {
				statuses = append(statuses, domain.FlowServer{Server: group.server.ID, Status: domain.ServerNeedsCheckout})
			}
			groups = nil
		}
	}
	kept := s.keptFor(comparison, build.generation)
	reused, runs := kept.split(groups)
	analyze := kept.godot == nil && hasScripts(files)
	var tracked []string
	var trackedErr error
	if len(runs) > 0 || analyze {
		tracked, trackedErr = s.git.TrackedPaths(ctx, comparison)
	}
	var projects []godotProject
	if analyze && trackedErr != nil {
		statuses = append(statuses, flowFailure(ctx, GodotServer, trackedErr).Servers...)
	}
	if analyze && trackedErr == nil {
		projects = godotProjects(files, tracked)
	}
	var godot domain.FlowGraph
	if kept.godot != nil {
		godot = *kept.godot
	}
	pending := domain.NewFlowBuilder()
	for _, status := range statuses {
		pending.AddServer(status)
	}
	for index, group := range runs {
		pending.AddServer(domain.FlowServer{Server: group.server.ID, Status: domain.ServerIndexing})
		runs[index].tally = build.tracker.track(group.server.ID)
	}
	var godotTally flowTally
	if len(projects) > 0 {
		pending.AddServer(domain.FlowServer{Server: GodotServer, Status: domain.ServerIndexing})
		godotTally = build.tracker.track(GodotServer)
	}
	includeResults(pending, godot, reused)
	build.group(pending.Graph().StatusOnly(), versions)
	var wait sync.WaitGroup
	if len(projects) > 0 {
		wait.Go(func() {
			defer godotTally.finish()
			godot = s.godotFlow(ctx, comparison, projects)
			s.keepGodot(comparison, build.generation, godot)
		})
	}
	var walked []groupResult
	if trackedErr != nil {
		walked = failedGroups(ctx, runs, trackedErr)
	} else {
		walked = s.walkGroups(ctx, comparison, build.generation, runs, repoPaths(tracked, files))
	}
	wait.Wait()
	builder := domain.NewFlowBuilder()
	for _, status := range statuses {
		builder.AddServer(status)
	}
	includeResults(builder, godot, slices.Concat(reused, walked))
	return builder.Graph(), nil
}

func includeResults(builder *domain.FlowBuilder, godot domain.FlowGraph, results []groupResult) {
	builder.Include(godot)
	var crossings []domain.FlowEdge
	for _, result := range results {
		builder.Include(result.graph)
		crossings = append(crossings, result.crossings...)
	}
	builder.Link(crossings)
}

func repoPaths(tracked []string, files []domain.LineChanges) map[string]bool {
	paths := make(map[string]bool, len(tracked)+len(files))
	for _, file := range tracked {
		paths[file] = true
	}
	for _, file := range files {
		paths[file.Path] = true
	}
	return paths
}

func failedGroups(ctx context.Context, groups []flowGroup, err error) []groupResult {
	results := make([]groupResult, len(groups))
	for index, group := range groups {
		group.tally.finish()
		results[index] = groupResult{graph: flowFailure(ctx, group.server.ID, err)}
	}
	return results
}

func (s *ChangeFlowService) walkGroups(ctx context.Context, comparison domain.Comparison, generation flowGeneration, groups []flowGroup, repo map[string]bool) []groupResult {
	contents, err := s.groupContents(ctx, comparison, groups)
	if err != nil {
		return failedGroups(ctx, groups, err)
	}
	results := make([]groupResult, len(groups))
	slots := make(chan struct{}, flowGroupLimit)
	var wait sync.WaitGroup
	for index, group := range groups {
		wait.Go(func() {
			defer group.tally.finish()
			select {
			case slots <- struct{}{}:
			case <-ctx.Done():
				results[index] = groupResult{graph: flowFailure(ctx, group.server.ID, ctx.Err())}
				return
			}
			defer func() { <-slots }()
			results[index] = s.groupFlow(ctx, group, contents, repo)
			s.keep(comparison, generation, group, results[index])
		})
	}
	wait.Wait()
	return results
}

func (s *ChangeFlowService) groups(files []domain.LineChanges) ([]flowGroup, []domain.FlowServer, serverVersions) {
	var groups []flowGroup
	var statuses []domain.FlowServer
	versions := serverVersions{}
	installations := map[string]langserver.Installation{}
	index := map[string]int{}
	roots := map[string]string{}
	for _, file := range files {
		server, _, ok := s.catalog.ServerFor(file.Path)
		if !ok {
			continue
		}
		if _, known := versions[server.ID]; !known {
			installation, found, err := s.installs.Find(server.ID)
			versions.record(server.ID, installation, found)
			if found && err == nil {
				installations[server.ID] = installation
			} else {
				statuses = append(statuses, domain.FlowServerUnavailable(server.ID, err))
			}
		}
		installation, installed := installations[server.ID]
		if !installed {
			continue
		}
		directory := server.ID + "\x00" + path.Dir(file.Path)
		root, known := roots[directory]
		if !known {
			root = s.project.RootOf(s.project.Path(file.Path), server.RootMarkers)
			roots[directory] = root
		}
		key := server.ID + "\x00" + root
		position, exists := index[key]
		if !exists {
			position = len(groups)
			index[key] = position
			groups = append(groups, flowGroup{server: server, installation: installation, root: root})
		}
		groups[position].files = append(groups[position].files, file)
	}
	return groups, statuses, versions
}

func (s *ChangeFlowService) groupFlow(ctx context.Context, group flowGroup, contents map[domain.FileSide]map[string]domain.Blob, repo map[string]bool) groupResult {
	server := group.server.ID
	startCtx, cancel := context.WithTimeout(ctx, s.startWait)
	client, err := s.sessions.Client(startCtx, serverLaunch(s.launcher, group.server, group.installation, group.root))
	cancel()
	if err != nil {
		return groupResult{graph: flowFailure(ctx, server, err)}
	}
	capabilities := client.Capabilities()
	if !capabilities.DocumentSymbols {
		return groupResult{graph: domain.FlowGraphWith(server, domain.ServerUnsupported, nil)}
	}
	documents := s.documentsOn(group, domain.FileSideNew, contents[domain.FileSideNew])
	previous := s.documentsOn(group, domain.FileSideOld, contents[domain.FileSideOld])
	opened := map[string]bool{}
	for _, document := range slices.Concat(documents, previous) {
		opened[document.Path] = true
	}
	walk := flowWalk{service: s, group: group, capabilities: capabilities, builder: domain.NewFlowBuilder(), opened: opened, repo: repo}
	group.tally.reading(len(documents))
	if err := client.Batch(ctx, documents, walk.run); err != nil {
		return groupResult{graph: flowFailure(ctx, server, err)}
	}
	if len(previous) > 0 {
		if err := client.Batch(ctx, previous, walk.removed); err != nil {
			return groupResult{graph: flowFailure(ctx, server, err)}
		}
	}
	if walk.incomplete(client.Indexing()) {
		return groupResult{graph: domain.FlowGraphWith(server, domain.ServerIndexing, nil)}
	}
	status := domain.ServerReady
	if !capabilities.CallHierarchy {
		status = domain.ServerUnsupported
	}
	walk.builder.AddServer(domain.FlowServer{Server: server, Status: status})
	return groupResult{graph: walk.builder.Graph(), crossings: walk.crossings}
}

func flowFailure(ctx context.Context, server string, err error) domain.FlowGraph {
	return domain.FlowGraphWith(server, serverStatusOf(ctx, err), err)
}

func (s *ChangeFlowService) groupContents(ctx context.Context, comparison domain.Comparison, groups []flowGroup) (map[domain.FileSide]map[string]domain.Blob, error) {
	contents := map[domain.FileSide]map[string]domain.Blob{}
	for _, side := range []domain.FileSide{domain.FileSideNew, domain.FileSideOld} {
		var paths []string
		for _, group := range groups {
			for _, file := range group.files {
				if file.Opens(side) {
					paths = append(paths, file.File().PathOn(side))
				}
			}
		}
		if len(paths) == 0 {
			continue
		}
		blobs, err := s.git.ContentsOf(ctx, comparison, side, paths, langserver.ReadLimit)
		if err != nil {
			return nil, err
		}
		contents[side] = blobs
	}
	return contents, nil
}

func (s *ChangeFlowService) documentsOn(group flowGroup, side domain.FileSide, contents map[string]domain.Blob) []lsp.Document {
	var documents []lsp.Document
	for _, file := range group.files {
		if !file.Opens(side) {
			continue
		}
		content, found := contents[file.File().PathOn(side)]
		if !found || content.IsBinary() {
			continue
		}
		languageID, _ := s.catalog.FileTypeOf(file.Path)
		documents = append(documents, lsp.Document{Path: s.documentPath(file.Path, side), LanguageID: languageID, Text: string(content)})
	}
	return documents
}

func (s *ChangeFlowService) documentPath(file string, side domain.FileSide) string {
	absolute := s.project.Path(file)
	if side == domain.FileSideOld {
		return filepath.Join(filepath.Dir(absolute), previousPrefix+filepath.Base(absolute))
	}
	return absolute
}
