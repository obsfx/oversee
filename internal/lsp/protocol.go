package lsp

import (
	"encoding/json/jsontext"
	"encoding/json/v2"
	"fmt"
	"net/url"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/obsfx/oversee/internal/domain"
)

type Position struct {
	Line      int `json:"line"`
	Character int `json:"character"`
}

type Range struct {
	Start Position `json:"start"`
	End   Position `json:"end"`
}

type Location struct {
	URI   string `json:"uri"`
	Range Range  `json:"range"`
}

type locationOrLink struct {
	URI                  string `json:"uri"`
	Range                Range  `json:"range"`
	TargetURI            string `json:"targetUri"`
	TargetRange          Range  `json:"targetRange"`
	TargetSelectionRange *Range `json:"targetSelectionRange"`
}

type FileChangeType int

const (
	FileChanged FileChangeType = 2
	FileDeleted FileChangeType = 3
)

type FileEvent struct {
	URI  string         `json:"uri"`
	Type FileChangeType `json:"type"`
}

type didChangeWatchedFilesParams struct {
	Changes []FileEvent `json:"changes"`
}

type textDocumentItem struct {
	URI        string `json:"uri"`
	LanguageID string `json:"languageId"`
	Version    int    `json:"version"`
	Text       string `json:"text"`
}

type textDocumentIdentifier struct {
	URI string `json:"uri"`
}

type didOpenParams struct {
	TextDocument textDocumentItem `json:"textDocument"`
}

type didCloseParams struct {
	TextDocument textDocumentIdentifier `json:"textDocument"`
}

type versionedTextDocumentIdentifier struct {
	URI     string `json:"uri"`
	Version int    `json:"version"`
}

type contentChange struct {
	Text string `json:"text"`
}

type didChangeParams struct {
	TextDocument   versionedTextDocumentIdentifier `json:"textDocument"`
	ContentChanges []contentChange                 `json:"contentChanges"`
}

type positionParams struct {
	TextDocument textDocumentIdentifier `json:"textDocument"`
	Position     Position               `json:"position"`
}

func (p Position) in(path string) positionParams {
	return positionParams{TextDocument: textDocumentIdentifier{URI: FileURI(path)}, Position: p}
}

type workspaceFolder struct {
	URI  string `json:"uri"`
	Name string `json:"name"`
}

type initializeParams struct {
	ProcessID             int               `json:"processId"`
	ClientInfo            clientInfo        `json:"clientInfo"`
	RootURI               string            `json:"rootUri"`
	RootPath              string            `json:"rootPath"`
	WorkspaceFolders      []workspaceFolder `json:"workspaceFolders"`
	Capabilities          jsontext.Value    `json:"capabilities"`
	InitializationOptions map[string]any    `json:"initializationOptions,omitempty"`
}

type clientInfo struct {
	Name string `json:"name"`
}

type referenceContext struct {
	IncludeDeclaration bool `json:"includeDeclaration"`
}

type referenceParams struct {
	TextDocument textDocumentIdentifier `json:"textDocument"`
	Position     Position               `json:"position"`
	Context      referenceContext       `json:"context"`
}

type documentParams struct {
	TextDocument textDocumentIdentifier `json:"textDocument"`
}

type callItemParams struct {
	Item jsontext.Value `json:"item"`
}

type initializeResult struct {
	Capabilities struct {
		DocumentSymbolProvider jsontext.Value `json:"documentSymbolProvider"`
		CallHierarchyProvider  jsontext.Value `json:"callHierarchyProvider"`
		ImplementationProvider jsontext.Value `json:"implementationProvider"`
		ReferencesProvider     jsontext.Value `json:"referencesProvider"`
	} `json:"capabilities"`
}

type Capabilities struct {
	DocumentSymbols bool
	CallHierarchy   bool
	Implementation  bool
	References      bool
}

func (r initializeResult) capabilities() Capabilities {
	return Capabilities{
		DocumentSymbols: provided(r.Capabilities.DocumentSymbolProvider),
		CallHierarchy:   provided(r.Capabilities.CallHierarchyProvider),
		Implementation:  provided(r.Capabilities.ImplementationProvider),
		References:      provided(r.Capabilities.ReferencesProvider),
	}
}

func provided(value jsontext.Value) bool {
	return !absent(value) && strings.TrimSpace(string(value)) != "false"
}

func absent(value jsontext.Value) bool {
	trimmed := strings.TrimSpace(string(value))
	return trimmed == "" || trimmed == "null"
}

type SymbolKind int

const (
	SymbolKindClass       SymbolKind = 5
	SymbolKindMethod      SymbolKind = 6
	SymbolKindProperty    SymbolKind = 7
	SymbolKindField       SymbolKind = 8
	SymbolKindConstructor SymbolKind = 9
	SymbolKindEnum        SymbolKind = 10
	SymbolKindInterface   SymbolKind = 11
	SymbolKindFunction    SymbolKind = 12
	SymbolKindObject      SymbolKind = 19
	SymbolKindStruct      SymbolKind = 23
)

func (k SymbolKind) CanHaveImplementations() bool {
	return k == SymbolKindMethod || k == SymbolKindProperty || k == SymbolKindField || k == SymbolKindInterface || k == SymbolKindFunction
}

func (k SymbolKind) ClassLike() bool {
	return k == SymbolKindClass || k == SymbolKindInterface || k == SymbolKindEnum || k == SymbolKindStruct || k == SymbolKindObject
}

var symbolKinds = map[SymbolKind]domain.SymbolKind{
	1:  domain.SymbolContainer,
	2:  domain.SymbolContainer,
	3:  domain.SymbolContainer,
	4:  domain.SymbolContainer,
	5:  domain.SymbolContainer,
	6:  domain.SymbolCallable,
	7:  domain.SymbolValue,
	8:  domain.SymbolValue,
	9:  domain.SymbolCallable,
	10: domain.SymbolContainer,
	11: domain.SymbolContainer,
	12: domain.SymbolCallable,
	13: domain.SymbolValue,
	14: domain.SymbolValue,
	19: domain.SymbolContainer,
	23: domain.SymbolContainer,
}

type documentSymbol struct {
	Name           string           `json:"name"`
	Kind           SymbolKind       `json:"kind"`
	Range          Range            `json:"range"`
	SelectionRange Range            `json:"selectionRange"`
	Children       []documentSymbol `json:"children"`
	Location       *Location        `json:"location"`
	ContainerName  string           `json:"containerName"`
}

func (d documentSymbol) codeSymbol() domain.CodeSymbol {
	kind, known := symbolKinds[d.Kind]
	if !known {
		kind = domain.SymbolOther
	}
	span, selection, container := d.Range, d.SelectionRange, ""
	if d.Location != nil {
		span, selection, container = d.Location.Range, d.Location.Range, d.ContainerName
	}
	symbol := domain.CodeSymbol{
		Name:        d.Name,
		Container:   container,
		Kind:        kind,
		Method:      d.Kind == SymbolKindMethod || d.Kind == SymbolKindConstructor,
		ClassLike:   d.Kind.ClassLike(),
		Span:        domain.LineSpan{Start: span.Start.Line + 1, End: span.End.Line + 1},
		NameAt:      domain.SymbolPosition{Line: selection.Start.Line + 1, Character: selection.Start.Character},
		NameUnknown: d.Location != nil,
	}
	for _, child := range d.Children {
		symbol.Children = append(symbol.Children, child.codeSymbol())
	}
	return symbol
}

func parseSymbols(raw jsontext.Value) ([]domain.CodeSymbol, error) {
	var entries []documentSymbol
	if err := unmarshalList(raw, &entries); err != nil {
		return nil, err
	}
	symbols := make([]domain.CodeSymbol, 0, len(entries))
	for _, entry := range entries {
		symbols = append(symbols, entry.codeSymbol())
	}
	return symbols, nil
}

type CallItem struct {
	Name      string
	Kind      SymbolKind
	URI       string
	Selection Range
	raw       jsontext.Value
}

type callItem struct {
	Name           string     `json:"name"`
	Kind           SymbolKind `json:"kind"`
	URI            string     `json:"uri"`
	SelectionRange Range      `json:"selectionRange"`
}

type Call struct {
	Item       CallItem
	FromRanges []Range
}

func (c Call) Line() int {
	if len(c.FromRanges) == 0 {
		return c.Item.Selection.Start.Line + 1
	}
	return c.FromRanges[0].Start.Line + 1
}

type callEntry struct {
	To         jsontext.Value `json:"to"`
	From       jsontext.Value `json:"from"`
	FromRanges []Range        `json:"fromRanges"`
}

func parseCallItem(raw jsontext.Value) (CallItem, error) {
	var item callItem
	if err := json.Unmarshal(raw, &item, lenient...); err != nil {
		return CallItem{}, err
	}
	return CallItem{Name: item.Name, Kind: item.Kind, URI: item.URI, Selection: item.SelectionRange, raw: raw}, nil
}

func parseCallItems(raw jsontext.Value) ([]CallItem, error) {
	var entries []jsontext.Value
	if err := unmarshalList(raw, &entries); err != nil {
		return nil, err
	}
	items := make([]CallItem, 0, len(entries))
	for _, entry := range entries {
		item, err := parseCallItem(entry)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func parseCalls(raw jsontext.Value, outgoing bool) ([]Call, error) {
	var entries []callEntry
	if err := unmarshalList(raw, &entries); err != nil {
		return nil, err
	}
	calls := make([]Call, 0, len(entries))
	for _, entry := range entries {
		target := entry.From
		if outgoing {
			target = entry.To
		}
		item, err := parseCallItem(target)
		if err != nil {
			return nil, err
		}
		calls = append(calls, Call{Item: item, FromRanges: entry.FromRanges})
	}
	return calls, nil
}

func unmarshalList[T any](raw jsontext.Value, entries *[]T) error {
	if absent(raw) {
		return nil
	}
	return json.Unmarshal(raw, entries, lenient...)
}

type progressParams struct {
	Token jsontext.Value `json:"token"`
	Value struct {
		Kind string `json:"kind"`
	} `json:"value"`
}

type configurationParams struct {
	Items []jsontext.Value `json:"items"`
}

var clientCapabilities = jsontext.Value(`{
	"general": {"positionEncodings": ["utf-16"]},
	"textDocument": {
		"synchronization": {"dynamicRegistration": false, "didSave": false},
		"definition": {"dynamicRegistration": false, "linkSupport": true},
		"implementation": {"dynamicRegistration": false, "linkSupport": true},
		"references": {"dynamicRegistration": false},
		"documentSymbol": {"dynamicRegistration": false, "hierarchicalDocumentSymbolSupport": true, "symbolKind": {"valueSet": [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26]}},
		"callHierarchy": {"dynamicRegistration": false}
	},
	"workspace": {"workspaceFolders": true, "configuration": true, "didChangeWatchedFiles": {"dynamicRegistration": true}},
	"window": {"workDoneProgress": true}
}`)

func FileEventOf(path string, exists bool) FileEvent {
	if exists {
		return FileEvent{URI: FileURI(path), Type: FileChanged}
	}
	return FileEvent{URI: FileURI(path), Type: FileDeleted}
}

func FileURI(path string) string {
	slashed := filepath.ToSlash(path)
	if !strings.HasPrefix(slashed, "/") {
		slashed = "/" + slashed
	}
	return (&url.URL{Scheme: "file", Path: slashed}).String()
}

func PathOf(uri string) (string, error) {
	parsed, err := url.Parse(uri)
	if err != nil {
		return "", err
	}
	if parsed.Scheme != "file" {
		return "", fmt.Errorf("%s is not a file uri", uri)
	}
	path := parsed.Path
	if runtime.GOOS == "windows" {
		path = strings.TrimPrefix(path, "/")
	}
	return filepath.FromSlash(path), nil
}

func parseLocations(raw jsontext.Value) ([]Location, error) {
	if absent(raw) {
		return nil, nil
	}
	var entries []locationOrLink
	if strings.HasPrefix(strings.TrimSpace(string(raw)), "{") {
		var single locationOrLink
		if err := json.Unmarshal(raw, &single, lenient...); err != nil {
			return nil, err
		}
		entries = []locationOrLink{single}
	} else if err := json.Unmarshal(raw, &entries, lenient...); err != nil {
		return nil, err
	}
	locations := make([]Location, 0, len(entries))
	for _, entry := range entries {
		locations = append(locations, entry.location())
	}
	return locations, nil
}

func (l locationOrLink) location() Location {
	if l.TargetURI == "" {
		return Location{URI: l.URI, Range: l.Range}
	}
	if l.TargetSelectionRange != nil {
		return Location{URI: l.TargetURI, Range: *l.TargetSelectionRange}
	}
	return Location{URI: l.TargetURI, Range: l.TargetRange}
}
