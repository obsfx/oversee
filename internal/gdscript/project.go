package gdscript

import (
	"iter"
	"path"
	"strconv"
	"strings"
	"unicode"

	"github.com/obsfx/oversee/internal/domain"
)

const (
	ProjectFile      = "project.godot"
	ScriptExtension  = ".gd"
	ignoreFile       = ".gdignore"
	resourcePrefix   = "res://"
	maxInheritance   = 32
	autoloadSection  = "[autoload]"
	singletonPrefix  = "*"
	qualifiedJoiner  = "."
	settingSeparator = "="
)

type ClassRef struct {
	Path  string
	Class *Class
}

type FunctionRef struct {
	ClassRef
	Function *Function
}

type Project struct {
	directory  string
	scripts    map[string]*Script
	classNames map[string]string
	autoloads  map[string]string
}

func NewProject(root string, settings []byte, scripts map[string]*Script) *Project {
	project := &Project{directory: root, scripts: scripts, classNames: map[string]string{}, autoloads: map[string]string{}}
	ambiguous := map[string]bool{}
	for scriptPath, script := range scripts {
		if script.ClassName == "" {
			continue
		}
		if _, taken := project.classNames[script.ClassName]; taken {
			ambiguous[script.ClassName] = true
		}
		project.classNames[script.ClassName] = scriptPath
	}
	for name := range ambiguous {
		delete(project.classNames, name)
	}
	for name, resource := range autoloadsOf(settings) {
		if strings.HasSuffix(resource, ScriptExtension) {
			project.autoloads[name] = project.resolvePath("", resource)
		}
	}
	return project
}

func autoloadsOf(settings []byte) map[string]string {
	autoloads := map[string]string{}
	inSection := false
	for line := range strings.Lines(string(settings)) {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "[") {
			inSection = line == autoloadSection
			continue
		}
		name, value, found := strings.Cut(line, settingSeparator)
		if !inSection || !found {
			continue
		}
		resource, err := strconv.Unquote(strings.TrimSpace(value))
		if err != nil {
			continue
		}
		if singleton, enabled := strings.CutPrefix(resource, singletonPrefix); enabled {
			autoloads[strings.TrimSpace(name)] = singleton
		}
	}
	return autoloads
}

func (p *Project) resolvePath(from, reference string) string {
	if rest, found := strings.CutPrefix(reference, resourcePrefix); found {
		return path.Join(p.directory, rest)
	}
	return path.Join(path.Dir(from), reference)
}

func (p *Project) Script(scriptPath string) (*Script, bool) {
	script, found := p.scripts[scriptPath]
	return script, found
}

func (p *Project) DisplayName(scriptPath string) string {
	if script, found := p.scripts[scriptPath]; found && script.ClassName != "" {
		return script.ClassName
	}
	return DisplayNameOf(scriptPath, "")
}

func DisplayNameOf(scriptPath, className string) string {
	if className != "" {
		return className
	}
	stem := strings.TrimSuffix(path.Base(scriptPath), path.Ext(scriptPath))
	var name strings.Builder
	upper := true
	for _, character := range stem {
		if character == '_' || character == '-' || character == ' ' {
			upper = true
			continue
		}
		if upper {
			character = unicode.ToUpper(character)
			upper = false
		}
		name.WriteRune(character)
	}
	return name.String()
}

type ScriptFunction struct {
	FunctionRef
	Unit domain.FlowUnit
}

func Functions(scriptPath string, script *Script, display string) []ScriptFunction {
	var functions []ScriptFunction
	collectFunctions(scriptPath, script.Root, display, &functions)
	return functions
}

func collectFunctions(scriptPath string, class *Class, prefix string, functions *[]ScriptFunction) {
	for _, function := range class.Functions {
		*functions = append(*functions, ScriptFunction{
			FunctionRef: FunctionRef{ClassRef: ClassRef{Path: scriptPath, Class: class}, Function: function},
			Unit:        domain.FlowUnit{Name: prefix + qualifiedJoiner + function.Name, Method: true, Span: function.Span, NameAt: function.NameAt},
		})
	}
	for _, inner := range class.Classes {
		collectFunctions(scriptPath, inner, prefix+qualifiedJoiner+inner.Name, functions)
	}
}

func (p *Project) Resolve(caller FunctionRef, call Call) (FunctionRef, bool) {
	target, found := p.object(caller, call.Reference)
	if !found {
		return FunctionRef{}, false
	}
	return p.method(target, call.Name)
}

func (p *Project) SignalOwner(caller FunctionRef, site SignalSite) (ClassRef, bool) {
	target, found := p.object(caller, site.Reference)
	if !found {
		return ClassRef{}, false
	}
	return p.declaring(target, site.Signal), true
}

func (p *Project) declaring(class ClassRef, signal string) ClassRef {
	for current := range p.lineage(class) {
		if current.Class.Declares(signal) {
			return current
		}
	}
	return class
}

func (p *Project) lineage(class ClassRef) iter.Seq[ClassRef] {
	return func(yield func(ClassRef) bool) {
		for range maxInheritance {
			if !yield(class) {
				return
			}
			parent, found := p.typeOf(class, class.Class.Extends)
			if !found {
				return
			}
			class = parent
		}
	}
}

func (p *Project) object(caller FunctionRef, reference Reference) (ClassRef, bool) {
	var current ClassRef
	found := false
	switch reference.Base {
	case ImplicitReceiver, SelfReceiver:
		current, found = caller.ClassRef, true
	case SuperReceiver:
		current, found = p.typeOf(caller.ClassRef, caller.Class.Extends)
	case NamedReceiver:
		current, found = p.value(caller, reference.Target)
	case CastReceiver:
		current, found = p.typeOf(caller.ClassRef, reference.Type)
	}
	for _, step := range reference.Path {
		if !found {
			return ClassRef{}, false
		}
		current, found = p.step(current, step)
	}
	return current, found
}

func (p *Project) step(class ClassRef, name string) (ClassRef, bool) {
	if member, owner, found := p.member(class, name); found {
		return p.typeOf(owner, member)
	}
	if inner, found := class.Class.Inner(name); found {
		return ClassRef{Path: class.Path, Class: inner}, true
	}
	return ClassRef{}, false
}

func (p *Project) method(class ClassRef, name string) (FunctionRef, bool) {
	for current := range p.lineage(class) {
		if function, found := current.Class.Function(name); found {
			return FunctionRef{ClassRef: current, Function: function}, true
		}
	}
	return FunctionRef{}, false
}

func (p *Project) value(caller FunctionRef, name string) (ClassRef, bool) {
	if member, owner, found := p.member(caller.ClassRef, name); found {
		return p.typeOf(owner, member)
	}
	if class, found := p.typeNamed(caller.ClassRef, name); found {
		return class, true
	}
	if scriptPath, found := p.autoloads[name]; found {
		return p.root(scriptPath)
	}
	return ClassRef{}, false
}

func (p *Project) member(class ClassRef, name string) (TypeRef, ClassRef, bool) {
	last := class
	for current := range p.lineage(class) {
		if member, found := current.Class.Members[name]; found {
			return member, current, true
		}
		last = current
	}
	if root, found := p.root(last.Path); found && root.Class != last.Class {
		if member, found := root.Class.Members[name]; found {
			return member, root, true
		}
	}
	return TypeRef{}, ClassRef{}, false
}

func (p *Project) typeOf(scope ClassRef, ref TypeRef) (ClassRef, bool) {
	if ref.Path != "" {
		return p.root(p.resolvePath(scope.Path, ref.Path))
	}
	if ref.Name == "" {
		return ClassRef{}, false
	}
	first, rest, dotted := strings.Cut(ref.Name, qualifiedJoiner)
	class, found := p.typeNamed(scope, first)
	for found && dotted {
		var next string
		next, rest, dotted = strings.Cut(rest, qualifiedJoiner)
		var inner *Class
		inner, found = class.Class.Inner(next)
		class = ClassRef{Path: class.Path, Class: inner}
	}
	return class, found
}

func (p *Project) typeNamed(scope ClassRef, name string) (ClassRef, bool) {
	if inner, found := scope.Class.Inner(name); found {
		return ClassRef{Path: scope.Path, Class: inner}, true
	}
	if root, found := p.root(scope.Path); found {
		if inner, found := root.Class.Inner(name); found {
			return ClassRef{Path: scope.Path, Class: inner}, true
		}
		if alias, found := root.Class.Members[name]; found && alias.Path != "" {
			return p.root(p.resolvePath(scope.Path, alias.Path))
		}
	}
	if scriptPath, found := p.classNames[name]; found {
		return p.root(scriptPath)
	}
	return ClassRef{}, false
}

func (p *Project) root(scriptPath string) (ClassRef, bool) {
	script, found := p.scripts[scriptPath]
	if !found {
		return ClassRef{}, false
	}
	return ClassRef{Path: scriptPath, Class: script.Root}, true
}
