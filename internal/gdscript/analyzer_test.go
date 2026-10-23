package gdscript

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"github.com/obsfx/oversee/internal/domain"
)

const fixtureGame = "testdata/dash-knight"

type fixtureProject struct {
	sources ProjectSources
	files   map[string]string
}

func loadFixtureGame(t *testing.T) fixtureProject {
	t.Helper()
	fixture := fixtureProject{files: map[string]string{}}
	err := filepath.WalkDir(fixtureGame, func(file string, entry fs.DirEntry, err error) error {
		if err != nil || entry.IsDir() {
			return err
		}
		content, err := os.ReadFile(file)
		if err != nil {
			return err
		}
		relative, err := filepath.Rel(fixtureGame, file)
		if err != nil {
			return err
		}
		relative = filepath.ToSlash(relative)
		fixture.files[relative] = string(content)
		switch {
		case relative == ProjectFile:
			fixture.sources.Settings = content
		case strings.HasSuffix(relative, ScriptExtension):
			fixture.sources.Scripts = append(fixture.sources.Scripts, Source{Path: relative, Content: content})
		case strings.HasSuffix(relative, SceneExtension):
			fixture.sources.Scenes = append(fixture.sources.Scenes, Source{Path: relative, Content: content})
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	return fixture
}

func (f fixtureProject) everyScriptAdded() []domain.LineChanges {
	var changes []domain.LineChanges
	for _, script := range f.sources.Scripts {
		changes = append(changes, domain.WholeFileAdded(script.Path))
	}
	return changes
}

func (f fixtureProject) touched(t *testing.T, scriptPath string, functions ...string) domain.LineChanges {
	t.Helper()
	lines := strings.Split(f.files[scriptPath], "\n")
	change := domain.LineChanges{Path: scriptPath, Status: domain.ChangeModified}
	for _, name := range functions {
		start := slices.IndexFunc(lines, func(line string) bool {
			return strings.HasPrefix(line, "func "+name+"(")
		})
		if start < 0 {
			t.Fatalf("%s has no func %s", scriptPath, name)
		}
		end := start + 1
		for end < len(lines) && !strings.HasPrefix(lines[end], "func ") {
			end++
		}
		change.Hunks = append(change.Hunks, domain.LineHunk{OldStart: start + 1, OldLines: end - start, NewStart: start + 1, NewLines: end - start})
	}
	return change
}

func flowOf(t *testing.T, sources ProjectSources, changes []domain.LineChanges) domain.FlowGraph {
	t.Helper()
	graph, err := NewAnalyzer().Flow(t.Context(), sources, changes)
	if err != nil {
		t.Fatalf("Flow: %v", err)
	}
	return graph
}

func describe(graph domain.FlowGraph) (nodes, edges, origins []string) {
	names := map[string]string{}
	for _, node := range graph.Nodes {
		names[node.ID] = node.Name
		nodes = append(nodes, fmt.Sprintf("%s %s %s", node.Name, node.Kind, node.Change))
	}
	for _, edge := range graph.Edges {
		edges = append(edges, strings.TrimSpace(fmt.Sprintf("%s -> %s :%d %s %s", names[edge.From], names[edge.To], edge.Line, edge.Via, edge.Label)))
	}
	for id, list := range graph.Origins {
		for _, origin := range list {
			origins = append(origins, fmt.Sprintf("%s <- %s %s:%d", names[id], origin.Name, origin.Path, origin.Line))
		}
	}
	slices.Sort(edges)
	slices.Sort(origins)
	return nodes, edges, origins
}

func expectLines(t *testing.T, label string, got, want []string) {
	t.Helper()
	if !slices.Equal(got, want) {
		t.Fatalf("%s\n got: %q\nwant: %q", label, got, want)
	}
}

func TestFlowOfTheFixtureGame(t *testing.T) {
	fixture := loadFixtureGame(t)

	nodes, edges, origins := describe(flowOf(t, fixture.sources, fixture.everyScriptAdded()))

	expectLines(t, "nodes", nodes, []string{
		"GameState.register_dash method added",
		"GameState.save_stats method added",
		"Slime._on_body_entered handler added",
		"Slime._bounce_away method added",
		"Player._physics_process callback added",
		"Player._read_input method added",
		"Player._try_dash method added",
		"Player._apply_movement method added",
		"Player.take_damage method added",
		"Player._die method added",
		"Player._on_hurtbox_area_entered handler added",
		"Hud._ready callback added",
		"Hud._on_health_changed handler added",
		"Hud._on_stamina_changed handler added",
		"Hud._update_bar method added",
		"Stamina._process callback added",
		"Stamina.consume method added",
		"Stamina.regenerate method added",
	})
	expectLines(t, "edges", edges, []string{
		"Hud._on_health_changed -> Hud._update_bar :15 call",
		"Hud._on_stamina_changed -> Hud._update_bar :19 call",
		"Hud._ready -> Hud._on_health_changed :10 connect health_changed",
		"Hud._ready -> Hud._on_stamina_changed :11 connect stamina_changed",
		"Player._die -> GameState.save_stats :61 call",
		"Player._on_hurtbox_area_entered -> Player.take_damage :67 call",
		"Player._physics_process -> Player._apply_movement :25 call",
		"Player._physics_process -> Player._read_input :22 call",
		"Player._physics_process -> Player._try_dash :24 call",
		"Player._try_dash -> GameState.register_dash :39 call",
		"Player._try_dash -> Stamina.consume :35 call",
		"Player.take_damage -> Hud._on_health_changed :53 signal health_changed",
		"Player.take_damage -> Player._die :55 call",
		"Slime._on_body_entered -> Player.take_damage :9 call",
		"Slime._on_body_entered -> Slime._bounce_away :10 call",
		"Stamina._process -> Stamina.regenerate :16 call",
		"Stamina.consume -> Hud._on_stamina_changed :23 signal stamina_changed",
		"Stamina.regenerate -> Hud._on_stamina_changed :29 signal stamina_changed",
	})
	expectLines(t, "origins", origins, []string{
		"Hud._ready <- engine calls it when the node and its children are ready :0",
		"Player._on_hurtbox_area_entered <- Hurtbox.area_entered scenes/player/player.tscn:24",
		"Player._physics_process <- engine calls it every physics frame :0",
		"Slime._on_body_entered <- Slime.body_entered scenes/enemies/slime.tscn:8",
		"Stamina._process <- engine calls it every frame :0",
	})
}

func TestFlowOriginsComeFromOutsideTheChange(t *testing.T) {
	fixture := loadFixtureGame(t)
	cases := []struct {
		name    string
		change  domain.LineChanges
		origins []string
	}{
		{
			name:   "a handler changed alone shows who connects it and who emits the signal",
			change: fixture.touched(t, "scenes/ui/hud.gd", "_on_health_changed"),
			origins: []string{
				"Hud._on_health_changed <- Hud._ready scenes/ui/hud.gd:10",
				"Hud._on_health_changed <- Player.take_damage scenes/player/player.gd:53",
			},
		},
		{
			name:   "a function changed alone shows its callers",
			change: fixture.touched(t, "scenes/player/player.gd", "take_damage"),
			origins: []string{
				"Player.take_damage <- Player._on_hurtbox_area_entered scenes/player/player.gd:67",
				"Player.take_damage <- Slime._on_body_entered scenes/enemies/slime.gd:9",
			},
		},
	}
	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			_, edges, origins := describe(flowOf(t, fixture.sources, []domain.LineChanges{testCase.change}))

			expectLines(t, "edges", edges, nil)
			expectLines(t, "origins", origins, testCase.origins)
		})
	}
}

func TestFlowListsRemovedFunctions(t *testing.T) {
	fixture := loadFixtureGame(t)
	previous, err := os.ReadFile("testdata/dash-knight-previous/player.gd")
	if err != nil {
		t.Fatal(err)
	}
	fixture.sources.Previous = []Source{{Path: "scenes/player/player.gd", Content: previous}}
	change := domain.LineChanges{Path: "scenes/player/player.gd", Status: domain.ChangeModified, Hunks: []domain.LineHunk{{OldStart: 27, OldLines: 6, NewStart: 27, NewLines: 0}}}

	graph := flowOf(t, fixture.sources, []domain.LineChanges{change})

	if len(graph.Nodes) != 1 {
		t.Fatalf("nodes = %+v, want only the removed function", graph.Nodes)
	}
	removed := graph.Nodes[0]
	if removed.ID != "scenes/player/player.gd#removed-27" || removed.Name != "Player._legacy_roll" || removed.Change != domain.FlowRemoved || removed.Line != 27 {
		t.Fatalf("removed node = %+v", removed)
	}
}

func TestFlowSkipsScriptsOverTheSizeLimit(t *testing.T) {
	source := "func huge():\n\tpass\n" + strings.Repeat("# padding\n", MaxScriptBytes/10)
	sources := ProjectSources{Scripts: []Source{{Path: "huge.gd", Content: []byte(source)}}}

	graph := flowOf(t, sources, []domain.LineChanges{domain.WholeFileAdded("huge.gd")})

	if len(graph.Nodes) != 0 {
		t.Fatalf("nodes = %+v, want none for an oversized script", graph.Nodes)
	}
}

func TestFlowStopsWhenCancelled(t *testing.T) {
	fixture := loadFixtureGame(t)
	ctx, cancel := context.WithCancel(t.Context())
	cancel()

	_, err := NewAnalyzer().Flow(ctx, fixture.sources, fixture.everyScriptAdded())

	if !errors.Is(err, context.Canceled) {
		t.Fatalf("Flow error = %v, want context.Canceled", err)
	}
}

func TestAnalyzerSharesScriptsByContent(t *testing.T) {
	analyzer := NewAnalyzer()
	content := []byte("func shared():\n\tpass\n")

	first, err := analyzer.parseSources(t.Context(), []Source{{Path: "a.gd", Content: content}, {Path: "b.gd", Content: bytes.Clone(content)}})
	if err != nil {
		t.Fatal(err)
	}
	second, err := analyzer.parseSources(t.Context(), []Source{{Path: "c.gd", Content: content}})
	if err != nil {
		t.Fatal(err)
	}

	if len(analyzer.scripts) != 1 || first["a.gd"] != second["c.gd"] {
		t.Fatalf("cache holds %d scripts, reused %v, want one shared parse", len(analyzer.scripts), first["a.gd"] == second["c.gd"])
	}
}

func TestFlowLabelsAddedAndModifiedFunctions(t *testing.T) {
	header := "class_name Player\nextends Node\n\n"
	cases := []struct {
		name     string
		previous string
		current  string
		hunks    []domain.LineHunk
		nodes    []string
		edges    []string
	}{
		{
			name:     "one hunk that edits a function and adds the next one",
			previous: header + "func existing():\n\tprint(\"original\")\n\nfunc untouched():\n\tpass\n",
			current:  header + "func existing():\n\tprint(\"changed\")\n\nfunc brand_new():\n\texisting()\n\nfunc untouched():\n\tpass\n",
			hunks:    []domain.LineHunk{{OldStart: 5, OldLines: 1, NewStart: 5, NewLines: 4}},
			nodes:    []string{"Player.brand_new method added", "Player.existing method modified"},
			edges:    []string{"Player.brand_new -> Player.existing :8 call"},
		},
		{
			name:     "a function that gains lines at its end is modified",
			previous: header + "func existing():\n\tprint(\"a\")\n",
			current:  header + "func existing():\n\tprint(\"a\")\n\tprint(\"b\")\n",
			hunks:    []domain.LineHunk{{OldStart: 5, OldLines: 0, NewStart: 6, NewLines: 1}},
			nodes:    []string{"Player.existing method modified"},
		},
		{
			name:     "a function whose first line changed is modified",
			previous: header + "func existing():\n\tprint(\"a\")\n",
			current:  header + "func existing(force: bool):\n\tprint(\"a\")\n",
			hunks:    []domain.LineHunk{{OldStart: 4, OldLines: 1, NewStart: 4, NewLines: 1}},
			nodes:    []string{"Player.existing method modified"},
		},
		{
			name:     "a function written over a removed one is added",
			previous: header + "func existing():\n\tprint(\"a\")\n\nfunc legacy():\n\tprint(\"legacy\")\n",
			current:  header + "func existing():\n\tprint(\"a\")\n\nfunc fresh():\n\texisting()\n",
			hunks:    []domain.LineHunk{{OldStart: 7, OldLines: 2, NewStart: 7, NewLines: 2}},
			nodes:    []string{"Player.fresh method added", "Player.legacy method removed"},
		},
		{
			name:     "a one line function edited in place is modified",
			previous: header + "func value(): return 1\n",
			current:  header + "func value(): return 2\n",
			hunks:    []domain.LineHunk{{OldStart: 4, OldLines: 1, NewStart: 4, NewLines: 1}},
			nodes:    []string{"Player.value method modified"},
		},
		{
			name:     "a function rewritten under its old name is modified",
			previous: header + "func existing():\n\tprint(\"a\")\n",
			current:  header + "func existing(force: bool):\n\tprint(\"b\")\n",
			hunks:    []domain.LineHunk{{OldStart: 4, OldLines: 2, NewStart: 4, NewLines: 2}},
			nodes:    []string{"Player.existing method modified"},
		},
		{
			name:     "a new engine callback keeps its role",
			previous: header + "func existing():\n\tpass\n",
			current:  header + "func existing():\n\tpass\n\nfunc _ready():\n\texisting()\n",
			hunks:    []domain.LineHunk{{OldStart: 5, OldLines: 0, NewStart: 6, NewLines: 3}},
			nodes:    []string{"Player._ready callback added"},
		},
	}
	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			sources := ProjectSources{
				Scripts:  []Source{{Path: "player.gd", Content: []byte(testCase.current)}},
				Previous: []Source{{Path: "player.gd", Content: []byte(testCase.previous)}},
			}
			change := domain.LineChanges{Path: "player.gd", Status: domain.ChangeModified, Hunks: testCase.hunks}

			nodes, edges, _ := describe(flowOf(t, sources, []domain.LineChanges{change}))
			slices.Sort(nodes)

			expectLines(t, "nodes", nodes, testCase.nodes)
			expectLines(t, "edges", edges, testCase.edges)
		})
	}
}
