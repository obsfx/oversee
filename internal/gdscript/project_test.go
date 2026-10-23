package gdscript

import (
	"maps"
	"reflect"
	"testing"
)

const resolutionSettings = `config_version=5

[application]
config/name="Arena"

[autoload]

GameState="*res://autoload/game_state.gd"
Music="*res://music.tscn"
Loader="res://autoload/loader.gd"

[input]
jump={"deadzone": 0.5}
`

var resolutionScripts = map[string]string{
	"game/base.gd": `class_name Base
extends Node

signal hurt

func base_only():
	pass

func shared():
	pass
`,
	"game/actor.gd": `class_name Actor
extends Base

const Bullet = preload("res://weapons/bullet.gd")

@onready var stamina: Stamina = $Stamina
var store := Store.new()
var loaded = load("weapons/bullet.gd")

func own():
	pass

func shared():
	pass

func caller(enemy: Enemy, body: Node2D, untyped):
	own()
	self.base_only()
	super.shared()
	stamina.consume()
	store.put()
	Bullet.fire()
	loaded.reload()
	Stamina.make()
	enemy.knock()
	(body as Enemy).stagger()
	if body is Enemy:
		body.flee()
	GameState.save()
	Helper.assist()
	stamina.store.take()
	untyped.anything()
	body.queue_free()
	get_tree().quit()

func wire(enemy: Enemy):
	hurt.emit()
	enemy.hurt.connect(own)
	self.ready.connect(own)
	untyped_signal.emit()

class Helper:
	static func assist():
		pass
`,
	"game/stamina.gd": `class_name Stamina
extends Node

var store: Store

static func make():
	pass

func consume():
	pass
`,
	"game/store.gd": `class_name Store

func put():
	pass

func take():
	pass
`,
	"game/enemy.gd": `class_name Enemy
extends Base

func knock():
	pass

func stagger():
	pass

func flee():
	pass
`,
	"game/weapons/bullet.gd": `extends Node

func fire():
	pass

func reload():
	pass
`,
	"game/autoload/game_state.gd": `extends Node

func save():
	pass
`,
}

func resolutionProject(t *testing.T) *Project {
	t.Helper()
	scripts := map[string]*Script{}
	for scriptPath, source := range resolutionScripts {
		scripts[scriptPath] = parseScript(t, source)
	}
	return NewProject("game", []byte(resolutionSettings), scripts)
}

func callerOf(t *testing.T, project *Project, name string) FunctionRef {
	t.Helper()
	script, _ := project.Script("game/actor.gd")
	function, found := script.Root.Function(name)
	if !found {
		t.Fatalf("actor.gd has no %s", name)
	}
	return FunctionRef{ClassRef: ClassRef{Path: "game/actor.gd", Class: script.Root}, Function: function}
}

func TestProjectAutoloadsAreScriptSingletons(t *testing.T) {
	project := resolutionProject(t)

	want := map[string]string{"GameState": "game/autoload/game_state.gd"}
	if !maps.Equal(project.autoloads, want) {
		t.Fatalf("autoloads = %v, want %v", project.autoloads, want)
	}
}

func TestProjectResolvePath(t *testing.T) {
	project := NewProject("game", nil, nil)
	cases := []struct {
		from      string
		reference string
		want      string
	}{
		{from: "game/actor.gd", reference: "res://weapons/bullet.gd", want: "game/weapons/bullet.gd"},
		{from: "game/actors/actor.gd", reference: "bullet.gd", want: "game/actors/bullet.gd"},
		{from: "game/actors/actor.gd", reference: "../weapons/bullet.gd", want: "game/weapons/bullet.gd"},
	}
	for _, testCase := range cases {
		if got := project.resolvePath(testCase.from, testCase.reference); got != testCase.want {
			t.Fatalf("resolvePath(%q, %q) = %q, want %q", testCase.from, testCase.reference, got, testCase.want)
		}
	}
	if got := NewProject("", nil, nil).resolvePath("main.gd", "res://ui/hud.gd"); got != "ui/hud.gd" {
		t.Fatalf("resolvePath at the repository root = %q", got)
	}
}

func TestDisplayNameOf(t *testing.T) {
	cases := map[[2]string]string{
		{"game/actor.gd", "Hero"}:              "Hero",
		{"autoload/game_state.gd", ""}:         "GameState",
		{"ui/main-menu.gd", ""}:                "MainMenu",
		{"levels/boss room.gd", ""}:            "BossRoom",
		{"scripts/component.with.dots.gd", ""}: "Component.with.dots",
	}
	for input, want := range cases {
		if got := DisplayNameOf(input[0], input[1]); got != want {
			t.Fatalf("DisplayNameOf(%q, %q) = %q, want %q", input[0], input[1], got, want)
		}
	}
}

func TestProjectResolveCalls(t *testing.T) {
	project := resolutionProject(t)
	caller := callerOf(t, project, "caller")

	got := map[string]string{}
	for _, call := range caller.Function.Calls {
		target := ""
		if callee, found := project.Resolve(caller, call); found {
			target = callee.Path + " " + callee.Class.Name + "." + callee.Function.Name
		}
		got[call.Name] = target
	}

	want := map[string]string{
		"own":        "game/actor.gd .own",
		"base_only":  "game/base.gd .base_only",
		"shared":     "game/base.gd .shared",
		"consume":    "game/stamina.gd .consume",
		"put":        "game/store.gd .put",
		"fire":       "game/weapons/bullet.gd .fire",
		"reload":     "game/weapons/bullet.gd .reload",
		"make":       "game/stamina.gd .make",
		"knock":      "game/enemy.gd .knock",
		"stagger":    "game/enemy.gd .stagger",
		"flee":       "game/enemy.gd .flee",
		"save":       "game/autoload/game_state.gd .save",
		"assist":     "game/actor.gd Helper.assist",
		"take":       "game/store.gd .take",
		"anything":   "",
		"queue_free": "",
		"get_tree":   "",
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("resolved calls\n got: %v\nwant: %v", got, want)
	}
}

func TestProjectSignalOwners(t *testing.T) {
	project := resolutionProject(t)
	caller := callerOf(t, project, "wire")
	base, _ := project.Script("game/base.gd")
	actor, _ := project.Script("game/actor.gd")

	owners := map[string]*Class{}
	for _, emit := range caller.Function.Emits {
		if owner, found := project.SignalOwner(caller, emit); found {
			owners["emit "+emit.Signal] = owner.Class
		}
	}
	for _, connection := range caller.Function.Connections {
		if owner, found := project.SignalOwner(caller, connection.SignalSite); found {
			owners["connect "+connection.Signal] = owner.Class
		}
	}

	want := map[string]*Class{
		"emit hurt":           base.Root,
		"connect hurt":        base.Root,
		"connect ready":       actor.Root,
		"emit untyped_signal": actor.Root,
	}
	if !maps.Equal(owners, want) {
		t.Fatalf("owners = %v, want %v", owners, want)
	}
}
