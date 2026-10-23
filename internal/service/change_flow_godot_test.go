package service

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/gdscript"
)

const godotSettings = "[autoload]\n\nGameState=\"*res://autoload/game_state.gd\"\n"

const godotPlayer = `class_name Player
extends Node

signal health_changed(value: int)

func take_damage(amount: int) -> void:
	health_changed.emit(amount)
	GameState.record()
`

const godotHud = `extends CanvasLayer

@export var player: Player

func _ready() -> void:
	player.health_changed.connect(_on_health_changed)

func _on_health_changed(value: int) -> void:
	pass
`

const godotState = `extends Node

func record() -> void:
	pass
`

const godotScene = `[gd_scene format=3]

[ext_resource type="Script" path="res://player.gd" id="1"]

[node name="Player" type="Node"]
script = ExtResource("1")

[node name="Hitbox" type="Area2D" parent="."]

[connection signal="area_entered" from="Hitbox" to="." method="take_damage"]
`

func (f *flowFixture) godotFile(path, source string) {
	f.git.contents["new:"+path] = source
}

func namedGraph(graph domain.FlowGraph) (nodes, edges, origins []string) {
	names := map[string]string{}
	for _, node := range graph.Nodes {
		names[node.ID] = node.Name
		nodes = append(nodes, fmt.Sprintf("%s %s %s", node.Path, node.Name, node.Kind))
	}
	for _, edge := range graph.Edges {
		edges = append(edges, strings.TrimSpace(fmt.Sprintf("%s -> %s %s %s", names[edge.From], names[edge.To], edge.Via, edge.Label)))
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

func TestChangeFlowAnalyzesGodotProjects(t *testing.T) {
	fixture := newFlowFixture(t)
	fixture.godotFile("game/project.godot", godotSettings)
	fixture.godotFile("game/player.tscn", godotScene)
	fixture.godotFile("game/autoload/game_state.gd", godotState)
	fixture.godotFile("game/player.gd", godotPlayer)
	fixture.godotFile("game/ui/hud.gd", godotHud)
	fixture.git.changes = []domain.LineChanges{
		domain.WholeFileAdded("game/player.gd"),
		domain.WholeFileAdded("game/ui/hud.gd"),
		domain.WholeFileAdded("game/autoload/game_state.gd"),
	}

	graph := fixture.flow(t, uncommitted)

	expectServers(t, graph, domain.FlowServer{Server: GodotServer, Status: domain.ServerReady})
	nodes, edges, origins := namedGraph(graph)
	expectStrings(t, "nodes", nodes, []string{
		"game/autoload/game_state.gd GameState.record method",
		"game/player.gd Player.take_damage handler",
		"game/ui/hud.gd Hud._ready callback",
		"game/ui/hud.gd Hud._on_health_changed handler",
	})
	expectStrings(t, "edges", edges, []string{
		"Hud._ready -> Hud._on_health_changed connect health_changed",
		"Player.take_damage -> GameState.record call",
		"Player.take_damage -> Hud._on_health_changed signal health_changed",
	})
	expectStrings(t, "origins", origins, []string{
		"Hud._ready <- engine calls it when the node and its children are ready :0",
		"Player.take_damage <- Hitbox.area_entered game/player.tscn:10",
	})
	if fixture.pool.launches != 0 {
		t.Fatalf("language server sessions = %d, want none for GDScript", fixture.pool.launches)
	}
}

func TestChangeFlowKeepsGodotProjectsApart(t *testing.T) {
	fixture := newFlowFixture(t)
	fixture.godotFile("client/project.godot", "")
	fixture.godotFile("client/caller.gd", "func call_out():\n\tShared.run()\n\tLocal.run()\n")
	fixture.godotFile("client/local.gd", "class_name Local\n\nfunc run():\n\tpass\n")
	fixture.godotFile("server/project.godot", "")
	fixture.godotFile("server/shared.gd", "class_name Shared\n\nfunc run():\n\tpass\n")
	fixture.godotFile("tools/loose.gd", "func helper():\n\tpass\n")
	for _, path := range []string{"client/caller.gd", "client/local.gd", "server/shared.gd", "tools/loose.gd"} {
		fixture.git.changes = append(fixture.git.changes, domain.WholeFileAdded(path))
	}

	graph := fixture.flow(t, uncommitted)

	_, edges, _ := namedGraph(graph)
	expectStrings(t, "edges", edges, []string{"Caller.call_out -> Local.run call"})
	if len(graph.Nodes) != 4 {
		t.Fatalf("nodes = %d, want every changed function of every project", len(graph.Nodes))
	}
}

func TestChangeFlowAnalyzesGodotWithoutACheckout(t *testing.T) {
	fixture := newFlowFixture(t)
	fixture.callChain()
	fixture.godotFile("project.godot", "")
	fixture.godotFile("player.gd", godotPlayer)
	fixture.git.changes = append(fixture.git.changes, domain.WholeFileAdded("player.gd"))

	graph := fixture.flow(t, domain.Comparison{Source: "feature", Target: "main"})

	expectServers(t, graph,
		domain.FlowServer{Server: "tsls", Status: domain.ServerNeedsCheckout},
		domain.FlowServer{Server: GodotServer, Status: domain.ServerReady},
	)
	nodes, _, _ := namedGraph(graph)
	expectStrings(t, "nodes", nodes, []string{"player.gd Player.take_damage method"})
}

func TestChangeFlowReadsTheOldSideOfRenamedScripts(t *testing.T) {
	fixture := newFlowFixture(t)
	fixture.godotFile("project.godot", "")
	fixture.godotFile("hero.gd", "class_name Hero\n\nfunc attack():\n\tpass\n")
	fixture.git.contents["old:player.gd"] = "class_name Hero\n\nfunc attack():\n\tpass\n\nfunc legacy_roll():\n\tpass\n"
	fixture.git.changes = []domain.LineChanges{{
		Path:         "hero.gd",
		PreviousPath: "player.gd",
		Status:       domain.ChangeRenamed,
		Hunks:        []domain.LineHunk{{OldStart: 5, OldLines: 3, NewStart: 4, NewLines: 0}},
	}}

	graph := fixture.flow(t, uncommitted)

	if len(graph.Nodes) != 1 || graph.Nodes[0].ID != "hero.gd#removed-6" || graph.Nodes[0].Name != "Hero.legacy_roll" {
		t.Fatalf("nodes = %+v, want the removed legacy_roll at its old line", graph.Nodes)
	}
}

func TestChangeFlowReportsGodotReadErrors(t *testing.T) {
	fixture := newFlowFixture(t)
	fixture.godotFile("player.gd", godotPlayer)
	fixture.git.changes = []domain.LineChanges{domain.WholeFileAdded("player.gd")}
	fixture.git.contentsErr = errors.New("cat-file failed")

	graph := fixture.flow(t, uncommitted)

	expectServers(t, graph, domain.FlowServer{Server: GodotServer, Status: domain.ServerFailed, Error: "cat-file failed"})
}

type blockingAnalyzer struct {
	release chan struct{}
	inner   GodotAnalyzer
}

func (a blockingAnalyzer) Flow(ctx context.Context, sources gdscript.ProjectSources, changes []domain.LineChanges) (domain.FlowGraph, error) {
	select {
	case <-a.release:
	case <-ctx.Done():
		return domain.FlowGraph{}, ctx.Err()
	}
	return a.inner.Flow(ctx, sources, changes)
}

func TestChangeFlowListsGodotAsIndexingWhileItRuns(t *testing.T) {
	fixture := newFlowFixture(t)
	release := make(chan struct{})
	flows := NewChangeFlowService(flowCatalog, fixture.git, fixture.installs, unusedLauncher{}, fakeProjectFiles{}, fixture.pool, blockingAnalyzer{release: release, inner: gdscript.NewAnalyzer()})
	t.Cleanup(flows.Close)
	flows.wait = 20 * time.Millisecond
	fixture.godotFile("player.gd", godotPlayer)
	fixture.git.changes = []domain.LineChanges{domain.WholeFileAdded("player.gd")}

	pending, err := flows.Flow(t.Context(), uncommitted)
	if err != nil {
		t.Fatal(err)
	}
	expectServers(t, pending, domain.FlowServer{Server: GodotServer, Status: domain.ServerIndexing})

	close(release)
	graph := pending
	for deadline := time.Now().Add(5 * time.Second); time.Now().Before(deadline) && !graph.Settled(); {
		graph, err = flows.Flow(t.Context(), uncommitted)
		if err != nil {
			t.Fatal(err)
		}
	}
	expectServers(t, graph, domain.FlowServer{Server: GodotServer, Status: domain.ServerReady})
}
