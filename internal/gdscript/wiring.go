package gdscript

import (
	"strings"

	"github.com/obsfx/oversee/internal/domain"
)

const (
	handlerPrefix  = "_on_"
	maxSceneNester = 16
)

var engineCallbacks = map[string]string{
	"_init":                "engine calls it when the object is created",
	"_enter_tree":          "engine calls it when the node enters the tree",
	"_ready":               "engine calls it when the node and its children are ready",
	"_exit_tree":           "engine calls it when the node leaves the tree",
	"_process":             "engine calls it every frame",
	"_physics_process":     "engine calls it every physics frame",
	"_input":               "engine calls it for every input event",
	"_unhandled_input":     "engine calls it for input nothing else handled",
	"_unhandled_key_input": "engine calls it for key input nothing else handled",
	"_shortcut_input":      "engine calls it for shortcut input",
	"_gui_input":           "engine calls it for input on this control",
	"_draw":                "engine calls it when the canvas item redraws",
	"_notification":        "engine calls it for every notification",
	"_integrate_forces":    "engine calls it during the physics step of the body",
}

type functionKey struct {
	path     string
	function *Function
}

func keyOf(function FunctionRef) functionKey {
	return functionKey{path: function.Path, function: function.Function}
}

type signalKey struct {
	path  string
	class *Class
	name  string
}

func (c ClassRef) signal(name string) signalKey {
	return signalKey{path: c.Path, class: c.Class, name: name}
}

type site struct {
	caller functionKey
	line   int
}

type wire struct {
	site
	signal signalKey
	known  bool
	label  string
	origin *domain.FlowOrigin
}

type Wiring struct {
	functions map[functionKey]ScriptFunction
	callers   map[functionKey][]site
	emitters  map[signalKey][]site
	wires     map[functionKey][]wire
}

func (p *Project) Wire(scenes map[string]Scene) *Wiring {
	wiring := &Wiring{
		functions: map[functionKey]ScriptFunction{},
		callers:   map[functionKey][]site{},
		emitters:  map[signalKey][]site{},
		wires:     map[functionKey][]wire{},
	}
	for scriptPath, script := range p.scripts {
		for _, function := range Functions(scriptPath, script, p.DisplayName(scriptPath)) {
			wiring.functions[keyOf(function.FunctionRef)] = function
		}
	}
	for key, function := range wiring.functions {
		p.wireFunction(wiring, key, function.FunctionRef)
	}
	for scenePath, scene := range scenes {
		for _, connection := range scene.Connections {
			p.wireScene(wiring, scenes, scenePath, scene, connection)
		}
	}
	return wiring
}

func (p *Project) wireFunction(wiring *Wiring, key functionKey, function FunctionRef) {
	for _, call := range function.Function.Calls {
		if callee, found := p.Resolve(function, call); found {
			wiring.callers[keyOf(callee)] = append(wiring.callers[keyOf(callee)], site{caller: key, line: call.Line})
		}
	}
	for _, emit := range function.Function.Emits {
		if owner, found := p.SignalOwner(function, emit); found {
			signal := owner.signal(emit.Signal)
			wiring.emitters[signal] = append(wiring.emitters[signal], site{caller: key, line: emit.Line})
		}
	}
	for _, connection := range function.Function.Connections {
		handler, found := p.Resolve(function, connection.Handler)
		if !found {
			continue
		}
		connected := wire{caller: key, line: connection.Line, label: connection.Signal}
		if owner, known := p.SignalOwner(function, connection.SignalSite); known {
			connected.signal = owner.signal(connection.Signal)
			connected.known = true
		}
		wiring.wires[keyOf(handler)] = append(wiring.wires[keyOf(handler)], connected)
	}
}

func (p *Project) wireScene(wiring *Wiring, scenes map[string]Scene, scenePath string, scene Scene, connection SceneConnection) {
	target, found := p.sceneNodeClass(scenes, scenePath, scene, connection.To, 0)
	if !found {
		return
	}
	handler, found := p.method(target, connection.Method)
	if !found {
		return
	}
	origin := domain.FlowOrigin{Name: scene.NodeName(connection.From) + qualifiedJoiner + connection.Signal, Path: scenePath, Line: connection.Line}
	connected := wire{line: connection.Line, label: connection.Signal, origin: &origin}
	if emitter, known := p.sceneNodeClass(scenes, scenePath, scene, connection.From, 0); known {
		owner := p.declaring(emitter, connection.Signal)
		connected.signal = owner.signal(connection.Signal)
		connected.known = true
	}
	wiring.wires[keyOf(handler)] = append(wiring.wires[keyOf(handler)], connected)
}

func (p *Project) sceneNodeClass(scenes map[string]Scene, scenePath string, scene Scene, nodePath string, depth int) (ClassRef, bool) {
	node, found := scene.Node(nodePath)
	if !found || depth > maxSceneNester {
		return ClassRef{}, false
	}
	if node.Script != "" {
		return p.root(p.resolvePath(scenePath, node.Script))
	}
	if node.Instance == "" {
		return ClassRef{}, false
	}
	instancePath := p.resolvePath(scenePath, node.Instance)
	instance, found := scenes[instancePath]
	if !found {
		return ClassRef{}, false
	}
	return p.sceneNodeClass(scenes, instancePath, instance, sceneRoot, depth+1)
}

func (w *Wiring) isHandler(key functionKey) bool {
	return len(w.wires[key]) > 0
}

func roleOf(name string, handler bool) domain.FlowKind {
	if _, callback := engineCallbacks[name]; callback {
		return domain.FlowCallback
	}
	if handler || strings.HasPrefix(name, handlerPrefix) {
		return domain.FlowHandler
	}
	return ""
}
