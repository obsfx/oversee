package gdscript

import (
	"slices"

	"github.com/obsfx/oversee/internal/domain"
)

type TypeRef struct {
	Name string
	Path string
}

func (t TypeRef) IsZero() bool {
	return t.Name == "" && t.Path == ""
}

type Receiver int

const (
	ImplicitReceiver Receiver = iota
	SelfReceiver
	SuperReceiver
	NamedReceiver
	CastReceiver
	LocalReceiver
)

type Reference struct {
	Base   Receiver
	Target string
	Type   TypeRef
	Path   []string
}

type Call struct {
	Reference
	Name string
	Line int
}

type SignalSite struct {
	Reference
	Signal string
	Line   int
}

type Connection struct {
	SignalSite
	Handler Call
}

type Function struct {
	Name        string
	Span        domain.LineSpan
	NameAt      domain.SymbolPosition
	Calls       []Call
	Emits       []SignalSite
	Connections []Connection
}

type Class struct {
	Name      string
	Extends   TypeRef
	Members   map[string]TypeRef
	Signals   []string
	Functions []*Function
	Classes   []*Class
}

func newClass(name string) *Class {
	return &Class{Name: name, Members: map[string]TypeRef{}}
}

func (c *Class) Function(name string) (*Function, bool) {
	for _, function := range c.Functions {
		if function.Name == name {
			return function, true
		}
	}
	return nil, false
}

func (c *Class) Inner(name string) (*Class, bool) {
	for _, inner := range c.Classes {
		if inner.Name == name {
			return inner, true
		}
	}
	return nil, false
}

func (c *Class) Declares(signal string) bool {
	return slices.Contains(c.Signals, signal)
}

type Script struct {
	ClassName string
	Root      *Class
}
