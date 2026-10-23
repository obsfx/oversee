package lsp

import (
	"reflect"
	"testing"

	"github.com/obsfx/oversee/internal/domain"
)

func TestDocumentSymbolCodeSymbolUsesOneBasedLinesAndTheSelectionStart(t *testing.T) {
	symbol := documentSymbol{
		Name:           "Server",
		Kind:           5,
		Range:          rangeOf(4, 0, 30, 1),
		SelectionRange: rangeOf(4, 6, 4, 12),
		Children: []documentSymbol{
			{Name: "Serve", Kind: 6, Range: rangeOf(10, 2, 20, 3), SelectionRange: rangeOf(11, 4, 11, 9)},
			{Name: "limit", Kind: 8, Range: rangeOf(6, 2, 6, 20), SelectionRange: rangeOf(6, 2, 6, 7)},
		},
	}
	want := domain.CodeSymbol{
		Name:      "Server",
		Kind:      domain.SymbolContainer,
		ClassLike: true,
		Span:      domain.LineSpan{Start: 5, End: 31},
		NameAt:    domain.SymbolPosition{Line: 5, Character: 6},
		Children: []domain.CodeSymbol{
			{
				Name:   "Serve",
				Kind:   domain.SymbolCallable,
				Method: true,
				Span:   domain.LineSpan{Start: 11, End: 21},
				NameAt: domain.SymbolPosition{Line: 12, Character: 4},
			},
			{
				Name:   "limit",
				Kind:   domain.SymbolValue,
				Span:   domain.LineSpan{Start: 7, End: 7},
				NameAt: domain.SymbolPosition{Line: 7, Character: 2},
			},
		},
	}
	if got := symbol.codeSymbol(); !reflect.DeepEqual(got, want) {
		t.Errorf("codeSymbol() =\n%+v\nwant\n%+v", got, want)
	}
}

func TestDocumentSymbolCodeSymbolKinds(t *testing.T) {
	tests := []struct {
		name       string
		kind       SymbolKind
		wantKind   domain.SymbolKind
		wantMethod bool
	}{
		{name: "file", kind: 1, wantKind: domain.SymbolContainer},
		{name: "module", kind: 2, wantKind: domain.SymbolContainer},
		{name: "namespace", kind: 3, wantKind: domain.SymbolContainer},
		{name: "package", kind: 4, wantKind: domain.SymbolContainer},
		{name: "class", kind: 5, wantKind: domain.SymbolContainer},
		{name: "method", kind: 6, wantKind: domain.SymbolCallable, wantMethod: true},
		{name: "property", kind: 7, wantKind: domain.SymbolValue},
		{name: "field", kind: 8, wantKind: domain.SymbolValue},
		{name: "constructor", kind: 9, wantKind: domain.SymbolCallable, wantMethod: true},
		{name: "enum", kind: 10, wantKind: domain.SymbolContainer},
		{name: "interface", kind: 11, wantKind: domain.SymbolContainer},
		{name: "function", kind: 12, wantKind: domain.SymbolCallable},
		{name: "variable", kind: 13, wantKind: domain.SymbolValue},
		{name: "constant", kind: 14, wantKind: domain.SymbolValue},
		{name: "string", kind: 15, wantKind: domain.SymbolOther},
		{name: "object", kind: 19, wantKind: domain.SymbolContainer},
		{name: "enum member", kind: 22, wantKind: domain.SymbolOther},
		{name: "struct", kind: 23, wantKind: domain.SymbolContainer},
		{name: "event", kind: 24, wantKind: domain.SymbolOther},
		{name: "type parameter", kind: 26, wantKind: domain.SymbolOther},
		{name: "unknown", kind: 0, wantKind: domain.SymbolOther},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got := documentSymbol{Name: test.name, Kind: test.kind}.codeSymbol()
			if got.Kind != test.wantKind || got.Method != test.wantMethod {
				t.Errorf("kind %d maps to %s (method %t), want %s (method %t)", test.kind, got.Kind, got.Method, test.wantKind, test.wantMethod)
			}
		})
	}
}

func TestParseLocationsReplacesInvalidUTF8(t *testing.T) {
	raw := []byte("[{\"uri\":\"file:///repo/\xff.go\",\"range\":{\"start\":{\"line\":1,\"character\":2},\"end\":{\"line\":1,\"character\":5}}}]")
	locations, err := parseLocations(raw)
	if err != nil {
		t.Fatalf("parseLocations: %v", err)
	}
	if len(locations) != 1 || locations[0].URI != "file:///repo/�.go" {
		t.Fatalf("locations = %+v, want one location with the invalid byte replaced", locations)
	}
}
