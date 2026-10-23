package gdscript

import (
	"maps"
	"regexp"
	"slices"
	"strings"

	"github.com/msuozzo/bonsai"
	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/gdscript/grammar"
)

var typePath = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$`)

func Parse(parser *bonsai.Parser, source []byte) (*Script, error) {
	root, err := parser.Parse(source)
	if err != nil {
		return nil, err
	}
	script := &Script{Root: newClass("")}
	extractor{source: source}.fill(script, script.Root, root.Children)
	return script, nil
}

type extractor struct {
	source []byte
}

func (e extractor) text(node *bonsai.Node) string {
	return string(node.Text(e.source))
}

func (e extractor) fill(script *Script, class *Class, statements []*bonsai.Node) {
	for _, node := range statements {
		switch node.Kind {
		case grammar.KindClassNameStatement:
			if name := node.ChildByField(grammar.FieldName); name != nil && script != nil {
				script.ClassName = e.text(name)
			}
			if extends := node.ChildByField(grammar.FieldExtends); extends != nil {
				class.Extends = e.extends(extends)
			}
		case grammar.KindExtendsStatement:
			class.Extends = e.extends(node)
		case grammar.KindVariableStatement, grammar.KindConstStatement:
			if name, ref, found := e.declaration(node); found {
				class.Members[name] = ref
			}
		case grammar.KindFunctionDefinition, grammar.KindConstructorDefinition:
			class.Functions = append(class.Functions, e.function(node))
		case grammar.KindSignalStatement:
			if name := node.ChildByField(grammar.FieldName); name != nil {
				class.Signals = append(class.Signals, e.text(name))
			}
		case grammar.KindClassDefinition:
			class.Classes = append(class.Classes, e.class(node))
		}
	}
}

func (e extractor) class(node *bonsai.Node) *Class {
	name := ""
	if nameNode := node.ChildByField(grammar.FieldName); nameNode != nil {
		name = e.text(nameNode)
	}
	class := newClass(name)
	if extends := node.ChildByField(grammar.FieldExtends); extends != nil {
		class.Extends = e.extends(extends)
	}
	if body := node.ChildByField(grammar.FieldBody); body != nil {
		e.fill(nil, class, body.Children)
	}
	return class
}

func (e extractor) extends(node *bonsai.Node) TypeRef {
	for _, child := range node.Children {
		switch child.Kind {
		case grammar.KindType:
			return TypeRef{Name: e.typeName(child)}
		case grammar.KindString:
			return TypeRef{Path: e.literal(child)}
		}
	}
	return TypeRef{}
}

func (e extractor) typeName(node *bonsai.Node) string {
	name := e.text(node)
	if !typePath.MatchString(name) {
		return ""
	}
	return name
}

func (e extractor) literal(node *bonsai.Node) string {
	return strings.Trim(e.text(node), `"'`)
}

func (e extractor) declaration(node *bonsai.Node) (string, TypeRef, bool) {
	nameNode := node.ChildByField(grammar.FieldName)
	if nameNode == nil {
		return "", TypeRef{}, false
	}
	return e.text(nameNode), e.declaredType(node), true
}

func (e extractor) declaredType(node *bonsai.Node) TypeRef {
	if declared := node.ChildByField(grammar.FieldType); declared != nil && declared.Kind == grammar.KindType {
		return TypeRef{Name: e.typeName(declared)}
	}
	if value := node.ChildByField(grammar.FieldValue); value != nil {
		return e.valueType(value)
	}
	return TypeRef{}
}

func (e extractor) valueType(value *bonsai.Node) TypeRef {
	switch value.Kind {
	case grammar.KindCall:
		return e.loaded(value)
	case grammar.KindIdentifier:
		return TypeRef{Name: e.text(value)}
	case grammar.KindAttribute:
		parts := named(value.Children)
		if len(parts) != 2 || parts[1].Kind != grammar.KindAttributeCall || e.callName(parts[1]) != "new" {
			return TypeRef{}
		}
		if parts[0].Kind == grammar.KindIdentifier {
			return TypeRef{Name: e.text(parts[0])}
		}
		if parts[0].Kind == grammar.KindCall {
			return e.loaded(parts[0])
		}
	}
	return TypeRef{}
}

func (e extractor) loaded(call *bonsai.Node) TypeRef {
	parts := named(call.Children)
	if len(parts) < 2 || parts[0].Kind != grammar.KindIdentifier {
		return TypeRef{}
	}
	if callee := e.text(parts[0]); callee != "preload" && callee != "load" {
		return TypeRef{}
	}
	for _, argument := range named(parts[1].Children) {
		if argument.Kind == grammar.KindString {
			return TypeRef{Path: e.literal(argument)}
		}
	}
	return TypeRef{}
}

func (e extractor) function(node *bonsai.Node) *Function {
	function := &Function{Name: "_init", Span: lineSpan(node)}
	function.NameAt = domain.SymbolPosition{Line: int(node.StartPoint.Row) + 1, Character: int(node.StartPoint.Col)}
	if name := node.ChildByField(grammar.FieldName); name != nil {
		function.Name = e.text(name)
		function.NameAt = domain.SymbolPosition{Line: int(name.StartPoint.Row) + 1, Character: int(name.StartPoint.Col)}
	}
	locals := map[string]TypeRef{}
	e.parameters(node, locals)
	if body := node.ChildByField(grammar.FieldBody); body != nil {
		e.walk(function, body, locals)
	}
	return function
}

func (e extractor) parameters(node *bonsai.Node, locals map[string]TypeRef) {
	parameters := node.ChildByField(grammar.FieldParameters)
	if parameters == nil {
		return
	}
	for _, parameter := range named(parameters.Children) {
		e.bind(parameter, locals)
	}
}

func (e extractor) bind(node *bonsai.Node, locals map[string]TypeRef) {
	if node.Kind == grammar.KindIdentifier {
		locals[e.text(node)] = TypeRef{}
		return
	}
	parts := named(node.Children)
	if len(parts) == 0 || parts[0].Kind != grammar.KindIdentifier {
		return
	}
	ref := TypeRef{}
	if node.Kind == grammar.KindTypedParameter || node.Kind == grammar.KindTypedDefaultParameter {
		ref = e.declaredType(node)
	}
	locals[e.text(parts[0])] = ref
}

func (e extractor) walk(function *Function, node *bonsai.Node, locals map[string]TypeRef) {
	switch node.Kind {
	case grammar.KindBody, grammar.KindPatternSection:
		locals = maps.Clone(locals)
	case grammar.KindVariableStatement, grammar.KindConstStatement:
		for _, child := range node.Children {
			e.walk(function, child, locals)
		}
		if name := node.ChildByField(grammar.FieldName); name != nil {
			locals[e.text(name)] = e.declaredType(node)
		}
		return
	case grammar.KindForStatement:
		inner := maps.Clone(locals)
		if left := node.ChildByField(grammar.FieldLeft); left != nil {
			inner[e.text(left)] = e.declaredType(node)
		}
		for _, child := range node.Children {
			if child.Field == grammar.FieldBody {
				e.walk(function, child, inner)
				continue
			}
			e.walk(function, child, locals)
		}
		return
	case grammar.KindLambda:
		inner := maps.Clone(locals)
		e.parameters(node, inner)
		for _, child := range node.Children {
			e.walk(function, child, inner)
		}
		return
	case grammar.KindPatternBinding:
		e.bind(node, locals)
	case grammar.KindIfStatement, grammar.KindElifClause:
		if condition := node.ChildByField(grammar.FieldCondition); condition != nil {
			inner := e.narrow(locals, condition)
			for _, child := range node.Children {
				if child.Field == grammar.FieldBody {
					e.walk(function, child, inner)
					continue
				}
				e.walk(function, child, locals)
			}
			return
		}
	case grammar.KindCall:
		e.call(function, node, locals)
	case grammar.KindAttribute:
		e.attribute(function, node, locals)
	case grammar.KindBaseCall:
		if name := e.callName(node); name != "" {
			function.Calls = append(function.Calls, Call{Reference: Reference{Base: SuperReceiver}, Name: name, Line: line(node)})
		}
	}
	for _, child := range node.Children {
		e.walk(function, child, locals)
	}
}

func (e extractor) narrow(locals map[string]TypeRef, condition *bonsai.Node) map[string]TypeRef {
	checks := map[string]TypeRef{}
	e.typeChecks(condition, checks)
	if len(checks) == 0 {
		return locals
	}
	inner := maps.Clone(locals)
	maps.Copy(inner, checks)
	return inner
}

func (e extractor) typeChecks(node *bonsai.Node, checks map[string]TypeRef) {
	if node.Kind == grammar.KindParenthesizedExpression {
		for _, inner := range named(node.Children) {
			e.typeChecks(inner, checks)
		}
		return
	}
	if node.Kind != grammar.KindBinaryOperator {
		return
	}
	left := node.ChildByField(grammar.FieldLeft)
	right := node.ChildByField(grammar.FieldRight)
	if left == nil || right == nil {
		return
	}
	switch e.operator(node) {
	case "is":
		if left.Kind == grammar.KindIdentifier {
			if name := e.typeName(right); name != "" {
				checks[e.text(left)] = TypeRef{Name: name}
			}
		}
	case "and", "&&":
		e.typeChecks(left, checks)
		e.typeChecks(right, checks)
	}
}

func (e extractor) operator(node *bonsai.Node) string {
	var tokens []string
	for _, child := range node.Children {
		if child.Field == grammar.FieldOp {
			tokens = append(tokens, e.text(child))
		}
	}
	return strings.Join(tokens, " ")
}

func (e extractor) call(function *Function, node *bonsai.Node, locals map[string]TypeRef) {
	parts := named(node.Children)
	if len(parts) == 0 || parts[0].Kind != grammar.KindIdentifier {
		return
	}
	name := e.text(parts[0])
	arguments := e.arguments(node)
	switch {
	case name == "super":
		function.Calls = append(function.Calls, Call{Reference: Reference{Base: SuperReceiver}, Name: function.Name, Line: line(node)})
	case name == "emit_signal" && e.isString(arguments, 0):
		function.Emits = append(function.Emits, SignalSite{Signal: e.literal(arguments[0]), Line: line(node)})
	case name == "connect" && e.isString(arguments, 0):
		e.connect(function, SignalSite{Signal: e.literal(arguments[0]), Line: line(node)}, arguments[1:], locals)
	default:
		function.Calls = append(function.Calls, Call{Name: name, Line: line(node)})
	}
}

func (e extractor) attribute(function *Function, node *bonsai.Node, locals map[string]TypeRef) {
	parts := named(node.Children)
	called := slices.IndexFunc(parts, func(part *bonsai.Node) bool {
		return part.Kind == grammar.KindAttributeCall
	})
	if called < 1 {
		return
	}
	name := e.callName(parts[called])
	arguments := e.arguments(parts[called])
	at := line(parts[called])
	owner := parts[called-1]
	switch {
	case name == "emit" && owner.Kind == grammar.KindIdentifier:
		if reference, found := e.reference(parts[:called-1], locals); found {
			function.Emits = append(function.Emits, SignalSite{Reference: reference, Signal: e.text(owner), Line: at})
		}
		e.addCall(function, parts[:called], name, at, locals)
	case name == "emit_signal" && e.isString(arguments, 0):
		if reference, found := e.reference(parts[:called], locals); found {
			function.Emits = append(function.Emits, SignalSite{Reference: reference, Signal: e.literal(arguments[0]), Line: at})
		}
	case name == "connect" && e.isString(arguments, 0):
		if reference, found := e.reference(parts[:called], locals); found {
			e.connect(function, SignalSite{Reference: reference, Signal: e.literal(arguments[0]), Line: at}, arguments[1:], locals)
		}
	case name == "connect" && owner.Kind == grammar.KindIdentifier:
		if reference, found := e.reference(parts[:called-1], locals); found {
			e.connect(function, SignalSite{Reference: reference, Signal: e.text(owner), Line: at}, arguments, locals)
		}
		e.addCall(function, parts[:called], name, at, locals)
	case name != "":
		e.addCall(function, parts[:called], name, at, locals)
	}
}

func (e extractor) addCall(function *Function, receiver []*bonsai.Node, name string, at int, locals map[string]TypeRef) {
	if reference, found := e.reference(receiver, locals); found {
		function.Calls = append(function.Calls, Call{Reference: reference, Name: name, Line: at})
	}
}

func (e extractor) connect(function *Function, site SignalSite, arguments []*bonsai.Node, locals map[string]TypeRef) {
	if len(arguments) == 0 {
		return
	}
	if handler, found := e.handler(arguments[0], locals); found {
		function.Connections = append(function.Connections, Connection{SignalSite: site, Handler: handler})
	}
}

func (e extractor) handler(node *bonsai.Node, locals map[string]TypeRef) (Call, bool) {
	switch node.Kind {
	case grammar.KindIdentifier:
		return Call{Name: e.text(node)}, true
	case grammar.KindAttribute:
		parts := named(node.Children)
		if len(parts) == 0 {
			return Call{}, false
		}
		if last := parts[len(parts)-1]; last.Kind == grammar.KindAttributeCall {
			if name := e.callName(last); name != "bind" && name != "unbind" {
				return Call{}, false
			}
			parts = parts[:len(parts)-1]
		}
		if len(parts) == 0 || parts[len(parts)-1].Kind != grammar.KindIdentifier {
			return Call{}, false
		}
		reference, found := e.reference(parts[:len(parts)-1], locals)
		return Call{Reference: reference, Name: e.text(parts[len(parts)-1])}, found
	case grammar.KindCall:
		parts := named(node.Children)
		arguments := e.arguments(node)
		if len(parts) == 0 || e.text(parts[0]) != "Callable" || len(arguments) != 2 || !e.isString(arguments, 1) {
			return Call{}, false
		}
		reference, found := e.reference(arguments[:1], locals)
		return Call{Reference: reference, Name: e.literal(arguments[1])}, found
	}
	return Call{}, false
}

func (e extractor) reference(nodes []*bonsai.Node, locals map[string]TypeRef) (Reference, bool) {
	if len(nodes) == 0 {
		return Reference{Base: ImplicitReceiver}, true
	}
	var reference Reference
	first := nodes[0]
	switch {
	case first.Kind == grammar.KindIdentifier && e.text(first) == "self":
		reference.Base = SelfReceiver
	case first.Kind == grammar.KindIdentifier && e.text(first) == "super":
		reference.Base = SuperReceiver
	case first.Kind == grammar.KindIdentifier:
		reference = nameReference(e.text(first), locals)
	case first.Kind == grammar.KindParenthesizedExpression:
		cast, found := e.cast(first)
		if !found {
			return Reference{}, false
		}
		reference = Reference{Base: CastReceiver, Type: cast}
	default:
		return Reference{}, false
	}
	for _, step := range nodes[1:] {
		if step.Kind != grammar.KindIdentifier {
			return Reference{}, false
		}
		reference.Path = append(reference.Path, e.text(step))
	}
	return reference, true
}

func (e extractor) arguments(call *bonsai.Node) []*bonsai.Node {
	arguments := call.ChildByField(grammar.FieldArguments)
	if arguments == nil {
		return nil
	}
	return named(arguments.Children)
}

func (e extractor) isString(arguments []*bonsai.Node, index int) bool {
	return index < len(arguments) && arguments[index].Kind == grammar.KindString
}

func (e extractor) cast(node *bonsai.Node) (TypeRef, bool) {
	inner := named(node.Children)
	if len(inner) != 1 || inner[0].Kind != grammar.KindBinaryOperator || e.operator(inner[0]) != "as" {
		return TypeRef{}, false
	}
	right := inner[0].ChildByField(grammar.FieldRight)
	if right == nil {
		return TypeRef{}, false
	}
	name := e.typeName(right)
	return TypeRef{Name: name}, name != ""
}

func (e extractor) callName(node *bonsai.Node) string {
	for _, child := range node.Children {
		if child.Kind == grammar.KindIdentifier {
			return e.text(child)
		}
	}
	return ""
}

func nameReference(name string, locals map[string]TypeRef) Reference {
	local, declared := locals[name]
	if !declared {
		return Reference{Base: NamedReceiver, Target: name}
	}
	if local.IsZero() {
		return Reference{Base: LocalReceiver, Target: name}
	}
	return Reference{Base: CastReceiver, Type: local}
}

func named(nodes []*bonsai.Node) []*bonsai.Node {
	result := make([]*bonsai.Node, 0, len(nodes))
	for _, node := range nodes {
		if node.Named && node.Kind != grammar.KindComment {
			result = append(result, node)
		}
	}
	return result
}

func line(node *bonsai.Node) int {
	return int(node.StartPoint.Row) + 1
}

func lineSpan(node *bonsai.Node) domain.LineSpan {
	end := node.EndPoint.Row
	if node.EndPoint.Col == 0 && end > node.StartPoint.Row {
		end--
	}
	return domain.LineSpan{Start: int(node.StartPoint.Row) + 1, End: int(end) + 1}
}
