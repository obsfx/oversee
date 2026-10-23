package gdscript

import (
	"fmt"
	"reflect"
	"slices"
	"strings"
	"testing"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/gdscript/grammar"
)

func parseScript(t *testing.T, source string) *Script {
	t.Helper()
	script, err := Parse(grammar.NewParser(), []byte(source))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	return script
}

func onlyFunction(t *testing.T, script *Script) *Function {
	t.Helper()
	if len(script.Root.Functions) != 1 {
		t.Fatalf("functions = %d, want 1", len(script.Root.Functions))
	}
	return script.Root.Functions[0]
}

func TestParseClassFacts(t *testing.T) {
	script := parseScript(t, `class_name Player extends Actor

signal health_changed(current: int)
signal died

const Bullet = preload("res://weapons/bullet.gd")
var loaded = load("res://weapons/rocket.gd")
@onready var stamina: Stamina = $Stamina
var store := Store.new()
var spawned := preload("res://enemies/slime.gd").new()
var speed := 3.0
var untyped

func _init():
	pass

static func make() -> Player:
	return Player.new()

class Helper extends Node:
	signal assisted

	func assist():
		pass
`)

	if script.ClassName != "Player" || script.Root.Extends != (TypeRef{Name: "Actor"}) {
		t.Fatalf("class_name %q extends %+v", script.ClassName, script.Root.Extends)
	}
	wantMembers := map[string]TypeRef{
		"Bullet":  {Path: "res://weapons/bullet.gd"},
		"loaded":  {Path: "res://weapons/rocket.gd"},
		"stamina": {Name: "Stamina"},
		"store":   {Name: "Store"},
		"spawned": {Path: "res://enemies/slime.gd"},
		"speed":   {},
		"untyped": {},
	}
	if !reflect.DeepEqual(script.Root.Members, wantMembers) {
		t.Fatalf("members = %+v, want %+v", script.Root.Members, wantMembers)
	}
	if !slices.Equal(script.Root.Signals, []string{"health_changed", "died"}) {
		t.Fatalf("signals = %q", script.Root.Signals)
	}
	constructor, found := script.Root.Function("_init")
	if !found || constructor.Span != (domain.LineSpan{Start: 14, End: 15}) || constructor.NameAt.Line != 14 {
		t.Fatalf("_init = %+v", constructor)
	}
	factory, found := script.Root.Function("make")
	if !found || factory.NameAt != (domain.SymbolPosition{Line: 17, Character: 12}) {
		t.Fatalf("make = %+v", factory)
	}
	helper, found := script.Root.Inner("Helper")
	if !found || helper.Extends != (TypeRef{Name: "Node"}) || !helper.Declares("assisted") {
		t.Fatalf("Helper = %+v", helper)
	}
	if _, found := helper.Function("assist"); !found {
		t.Fatalf("Helper.assist is missing")
	}
}

func TestParseExtendsAScriptPath(t *testing.T) {
	script := parseScript(t, "extends \"res://actors/base_actor.gd\"\n")

	if script.ClassName != "" || script.Root.Extends != (TypeRef{Path: "res://actors/base_actor.gd"}) {
		t.Fatalf("class_name %q extends %+v", script.ClassName, script.Root.Extends)
	}
}

func TestParseLocals(t *testing.T) {
	function := onlyFunction(t, parseScript(t, `func hit(damage: int, from: Enemy, target: Player = null, count := 2, untyped):
	var hud: Hud = get_hud()
	var bullet := Bullet.new()
	var guess = 4
	for enemy: Enemy in enemies:
		enemy.flee()
	damage.abs()
	from.knock()
	target.heal()
	count.clamp()
	untyped.anything()
	hud.show()
	bullet.fire()
	guess.round()
`))

	want := []string{
		"(named Bullet).new:3",
		"(cast Enemy).flee:6",
		"(cast int).abs:7",
		"(cast Enemy).knock:8",
		"(cast Player).heal:9",
		"(local count).clamp:10",
		"(local untyped).anything:11",
		"(cast Hud).show:12",
		"(cast Bullet).fire:13",
		"(local guess).round:14",
	}
	var got []string
	for _, call := range callStrings(function.Calls) {
		if !strings.Contains(call, "(implicit)") {
			got = append(got, call)
		}
	}
	if !slices.Equal(got, want) {
		t.Fatalf("calls = %q, want %q", got, want)
	}
}

func callStrings(calls []Call) []string {
	result := make([]string, 0, len(calls))
	for _, call := range calls {
		result = append(result, fmt.Sprintf("%s.%s:%d", referenceString(call.Reference), call.Name, call.Line))
	}
	return result
}

func referenceString(reference Reference) string {
	base := map[Receiver]string{ImplicitReceiver: "implicit", SelfReceiver: "self", SuperReceiver: "super", NamedReceiver: "named " + reference.Target, CastReceiver: "cast " + reference.Type.Name, LocalReceiver: "local " + reference.Target}[reference.Base]
	if len(reference.Path) > 0 {
		base += " " + strings.Join(reference.Path, ".")
	}
	return "(" + base + ")"
}

func TestParseCallsByReceiver(t *testing.T) {
	cases := []struct {
		name string
		body string
		want []string
	}{
		{name: "bare call", body: "helper()", want: []string{"(implicit).helper:2"}},
		{name: "self call", body: "self.die()", want: []string{"(self).die:2"}},
		{name: "super method", body: "super.hit(1)", want: []string{"(super).hit:2"}},
		{name: "super constructor call", body: "super(1)", want: []string{"(super).caller:2"}},
		{name: "named receiver", body: "stamina.consume(1)", want: []string{"(named stamina).consume:2"}},
		{name: "cast receiver", body: "(body as Enemy).knock()", want: []string{"(cast Enemy).knock:2"}},
		{name: "member chain", body: "player.stamina.consume()", want: []string{"(named player stamina).consume:2"}},
		{name: "call receivers stay unresolved", body: "get_tree().quit()", want: []string{"(implicit).get_tree:2"}},
		{name: "node paths stay unresolved", body: "$Sprite.play()", want: []string{}},
		{name: "calls inside arguments", body: "print(helper())", want: []string{"(implicit).print:2", "(implicit).helper:2"}},
		{name: "calls inside lambdas", body: "var run := func(): finish()", want: []string{"(implicit).finish:2"}},
		{
			name: "is narrows inside the block only",
			body: "if body is Enemy:\n\t\tbody.flee()\n\tbody.queue_free()",
			want: []string{"(cast Enemy).flee:3", "(local body).queue_free:4"},
		},
		{
			name: "elif with and narrows its own block",
			body: "if ready:\n\t\tpass\n\telif body is Enemy and alive:\n\t\tbody.flee()",
			want: []string{"(cast Enemy).flee:5"},
		},
	}
	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			function := onlyFunction(t, parseScript(t, "func caller(body):\n\t"+testCase.body+"\n"))

			if got := callStrings(function.Calls); !slices.Equal(got, testCase.want) {
				t.Fatalf("calls = %q, want %q", got, testCase.want)
			}
		})
	}
}

func siteString(site SignalSite) string {
	return fmt.Sprintf("%s.%s:%d", referenceString(site.Reference), site.Signal, site.Line)
}

func TestParseSignalSites(t *testing.T) {
	function := onlyFunction(t, parseScript(t, `func wire():
	died.emit()
	self.died.emit(1)
	player.died.emit()
	emit_signal("died")
	player.emit_signal("hurt", 2)
	died.connect(_on_died)
	player.died.connect(self._on_player_died)
	timer.timeout.connect(_on_timeout.bind(2))
	button.connect("pressed", Callable(self, "_on_pressed"))
	connect("ready", _on_ready)
	player.stamina.stamina_changed.connect(hud._on_stamina_changed)
	done.connect(func(): finish())
`))

	var emits []string
	for _, emit := range function.Emits {
		emits = append(emits, siteString(emit))
	}
	wantEmits := []string{"(implicit).died:2", "(self).died:3", "(named player).died:4", "(implicit).died:5", "(named player).hurt:6"}
	if !slices.Equal(emits, wantEmits) {
		t.Fatalf("emits = %q, want %q", emits, wantEmits)
	}
	var connections []string
	for _, connection := range function.Connections {
		handler := connection.Handler
		connections = append(connections, fmt.Sprintf("%s -> %s.%s:%d", siteString(connection.SignalSite), referenceString(handler.Reference), handler.Name, connection.Line))
	}
	wantConnections := []string{
		"(implicit).died:7 -> (implicit)._on_died:7",
		"(named player).died:8 -> (self)._on_player_died:8",
		"(named timer).timeout:9 -> (implicit)._on_timeout:9",
		"(named button).pressed:10 -> (self)._on_pressed:10",
		"(implicit).ready:11 -> (implicit)._on_ready:11",
		"(named player stamina).stamina_changed:12 -> (named hud)._on_stamina_changed:12",
	}
	if !slices.Equal(connections, wantConnections) {
		t.Fatalf("connections = %q, want %q", connections, wantConnections)
	}
	if got := callStrings(function.Calls); !slices.Contains(got, "(implicit).finish:13") {
		t.Fatalf("calls = %q, want the lambda's finish call", got)
	}
}

func TestParseKeepsFunctionsAfterARecoverableError(t *testing.T) {
	script := parseScript(t, "func first():\n\tif ready\n\t\tpass\n\nfunc second():\n\tpass\n")

	second, found := script.Root.Function("second")
	if !found || second.Span != (domain.LineSpan{Start: 5, End: 6}) {
		t.Fatalf("functions = %+v, want second at lines 5-6 after the missing colon", script.Root.Functions)
	}
}
