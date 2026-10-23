package service

import (
	"cmp"
	"context"
	"maps"
	"slices"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/gdscript"
)

const GodotServer = "gdscript"

type godotProject struct {
	root    string
	changes []domain.LineChanges
	scripts []string
	scenes  []string
}

func hasScripts(files []domain.LineChanges) bool {
	return slices.ContainsFunc(files, func(file domain.LineChanges) bool {
		return gdscript.IsScript(file.Path)
	})
}

func godotProjects(files []domain.LineChanges, tracked []string) []godotProject {
	var changed []domain.LineChanges
	for _, file := range files {
		if gdscript.IsScript(file.Path) {
			changed = append(changed, file)
		}
	}
	if len(changed) == 0 {
		return nil
	}
	paths := slices.Clone(tracked)
	for _, file := range files {
		if file.Status == domain.ChangeUntracked {
			paths = append(paths, file.Path)
		}
	}
	roots := gdscript.ProjectRoots(paths)
	ignored := gdscript.IgnoredDirectories(paths)
	projects := map[string]*godotProject{}
	for _, change := range changed {
		root := gdscript.RootOf(roots, change.Path)
		if gdscript.IsIgnored(ignored, root, change.Path) {
			continue
		}
		project, found := projects[root]
		if !found {
			project = &godotProject{root: root}
			projects[root] = project
		}
		project.changes = append(project.changes, change)
	}
	for _, file := range paths {
		if !gdscript.IsScript(file) && !gdscript.IsScene(file) {
			continue
		}
		root := gdscript.RootOf(roots, file)
		project, found := projects[root]
		if !found || gdscript.IsIgnored(ignored, root, file) {
			continue
		}
		if gdscript.IsScript(file) {
			project.scripts = append(project.scripts, file)
		}
		if gdscript.IsScene(file) {
			project.scenes = append(project.scenes, file)
		}
	}
	sorted := slices.SortedFunc(maps.Values(projects), func(left, right *godotProject) int {
		return cmp.Compare(left.root, right.root)
	})
	result := make([]godotProject, 0, len(sorted))
	for _, project := range sorted {
		result = append(result, *project)
	}
	return result
}

func (s *ChangeFlowService) godotFlow(ctx context.Context, comparison domain.Comparison, projects []godotProject) domain.FlowGraph {
	current, previous, err := s.godotContents(ctx, comparison, projects)
	if err != nil {
		return flowFailure(ctx, GodotServer, err)
	}
	builder := domain.NewFlowBuilder()
	for _, project := range projects {
		graph, err := s.godot.Flow(ctx, project.sources(current, previous), project.changes)
		if err != nil {
			graph = flowFailure(ctx, GodotServer, err)
		}
		builder.Include(graph)
	}
	builder.AddServer(domain.FlowServer{Server: GodotServer, Status: domain.ServerReady})
	return builder.Graph()
}

func (s *ChangeFlowService) godotContents(ctx context.Context, comparison domain.Comparison, projects []godotProject) (map[string]domain.Blob, map[string]domain.Blob, error) {
	var currentPaths, oldPaths []string
	for _, project := range projects {
		currentPaths = append(currentPaths, gdscript.SettingsPath(project.root))
		currentPaths = append(currentPaths, project.scripts...)
		currentPaths = append(currentPaths, project.scenes...)
		for _, change := range project.changes {
			if change.RemovesLines() {
				oldPaths = append(oldPaths, change.File().OldPath())
			}
		}
	}
	current, err := s.git.ContentsOf(ctx, comparison, domain.FileSideNew, currentPaths, gdscript.MaxSceneBytes)
	if err != nil {
		return nil, nil, err
	}
	if len(oldPaths) == 0 {
		return current, nil, nil
	}
	previous, err := s.git.ContentsOf(ctx, comparison, domain.FileSideOld, oldPaths, gdscript.MaxScriptBytes)
	if err != nil {
		return nil, nil, err
	}
	return current, previous, nil
}

func (p godotProject) sources(current, previous map[string]domain.Blob) gdscript.ProjectSources {
	sources := gdscript.ProjectSources{
		Root:     p.root,
		Settings: current[gdscript.SettingsPath(p.root)],
		Scripts:  presentSources(p.scripts, current),
		Scenes:   presentSources(p.scenes, current),
	}
	for _, change := range p.changes {
		if !change.RemovesLines() {
			continue
		}
		if content, found := previous[change.File().OldPath()]; found {
			sources.Previous = append(sources.Previous, gdscript.Source{Path: change.Path, Content: content})
		}
	}
	return sources
}

func presentSources(paths []string, contents map[string]domain.Blob) []gdscript.Source {
	sources := make([]gdscript.Source, 0, len(paths))
	for _, file := range paths {
		if content, found := contents[file]; found {
			sources = append(sources, gdscript.Source{Path: file, Content: content})
		}
	}
	return sources
}
