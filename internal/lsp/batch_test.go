package lsp

import (
	"reflect"
	"testing"

	"github.com/obsfx/oversee/internal/domain"
)

const serverFile = "/repo/server.go"

func TestBatchSymbols(t *testing.T) {
	tests := []struct {
		name   string
		answer string
		want   []domain.CodeSymbol
	}{
		{
			name:   "hierarchical document symbols with children",
			answer: `[{"name":"Server","detail":"struct","kind":23,"range":{"start":{"line":4,"character":0},"end":{"line":30,"character":1}},"selectionRange":{"start":{"line":4,"character":5},"end":{"line":4,"character":11}},"children":[{"name":"Serve","detail":"func(ctx context.Context) error","kind":6,"range":{"start":{"line":10,"character":1},"end":{"line":20,"character":2}},"selectionRange":{"start":{"line":10,"character":18},"end":{"line":10,"character":23}}}]}]`,
			want: []domain.CodeSymbol{{
				Name:      "Server",
				Kind:      domain.SymbolContainer,
				ClassLike: true,
				Span:      domain.LineSpan{Start: 5, End: 31},
				NameAt:    domain.SymbolPosition{Line: 5, Character: 5},
				Children: []domain.CodeSymbol{{
					Name:   "Serve",
					Kind:   domain.SymbolCallable,
					Method: true,
					Span:   domain.LineSpan{Start: 11, End: 21},
					NameAt: domain.SymbolPosition{Line: 11, Character: 18},
				}},
			}},
		},
		{
			name:   "flat symbol information uses the location range and container name",
			answer: `[{"name":"Serve","kind":6,"location":{"uri":"file:///repo/server.go","range":{"start":{"line":10,"character":0},"end":{"line":20,"character":1}}},"containerName":"Server"},{"name":"helper","kind":12,"location":{"uri":"file:///repo/server.go","range":{"start":{"line":22,"character":0},"end":{"line":25,"character":1}}}}]`,
			want: []domain.CodeSymbol{
				{Name: "Serve", Container: "Server", Kind: domain.SymbolCallable, Method: true, Span: domain.LineSpan{Start: 11, End: 21}, NameAt: domain.SymbolPosition{Line: 11}, NameUnknown: true},
				{Name: "helper", Kind: domain.SymbolCallable, Span: domain.LineSpan{Start: 23, End: 26}, NameAt: domain.SymbolPosition{Line: 23}, NameUnknown: true},
			},
		},
		{
			name:   "null",
			answer: `null`,
		},
		{
			name:   "empty list",
			answer: `[]`,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			client, server := startFakeClient(t, map[string]string{"textDocument/documentSymbol": test.answer})
			got := runBatch(t, client, nil, func(batch *Batch) ([]domain.CodeSymbol, error) {
				return batch.Symbols(serverFile)
			})
			if !equalOrBothEmpty(got, test.want) {
				t.Errorf("Symbols() =\n%+v\nwant\n%+v", got, test.want)
			}
			requests := server.messagesSinceStart(t, client)
			if len(requests) != 1 || requests[0].step(t) != "textDocument/documentSymbol file:///repo/server.go" {
				t.Errorf("requests = %+v, want one documentSymbol request for the file", requests)
			}
		})
	}
}

const preparedItem = `{"name":"Serve","kind":6,"detail":"Server","uri":"file:///repo/server.go","range":{"start":{"line":10,"character":0},"end":{"line":20,"character":1}},"selectionRange":{"start":{"line":10,"character":18},"end":{"line":10,"character":23}},"data":{"session":7}}`

func TestBatchPrepareCallHierarchy(t *testing.T) {
	tests := []struct {
		name   string
		answer string
		want   []CallItem
	}{
		{
			name:   "null",
			answer: `null`,
		},
		{
			name:   "empty list",
			answer: `[]`,
		},
		{
			name:   "items",
			answer: `[` + preparedItem + `]`,
			want: []CallItem{{
				Name:      "Serve",
				Kind:      6,
				URI:       "file:///repo/server.go",
				Selection: rangeOf(10, 18, 10, 23),
			}},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			client, server := startFakeClient(t, map[string]string{"textDocument/prepareCallHierarchy": test.answer})
			got := runBatch(t, client, nil, func(batch *Batch) ([]CallItem, error) {
				return batch.PrepareCallHierarchy(serverFile, Position{Line: 10, Character: 19})
			})
			if gotFields := callItemFields(got); !equalOrBothEmpty(gotFields, test.want) {
				t.Errorf("PrepareCallHierarchy() = %+v, want %+v", gotFields, test.want)
			}
			requests := server.messagesSinceStart(t, client)
			if len(requests) != 1 {
				t.Fatalf("requests = %+v, want one prepareCallHierarchy request", requests)
			}
			assertPositionRequest(t, requests[0], "textDocument/prepareCallHierarchy", sentPosition{Line: 10, Character: 19})
		})
	}
}

func TestBatchCallsSendThePreparedItemBack(t *testing.T) {
	client, server := startFakeClient(t, map[string]string{
		"textDocument/prepareCallHierarchy": `[` + preparedItem + `]`,
		"callHierarchy/outgoingCalls":       `[]`,
		"callHierarchy/incomingCalls":       `[]`,
	})
	runBatch(t, client, nil, func(batch *Batch) (struct{}, error) {
		items, err := batch.PrepareCallHierarchy(serverFile, Position{Line: 10, Character: 19})
		if err != nil {
			return struct{}{}, err
		}
		if _, err := batch.OutgoingCalls(items[0]); err != nil {
			return struct{}{}, err
		}
		_, err = batch.IncomingCalls(items[0])
		return struct{}{}, err
	})
	requests := server.messagesSinceStart(t, client)
	if len(requests) != 3 {
		t.Fatalf("requests = %+v, want prepare, outgoing and incoming", requests)
	}
	want := canonicalJSON(t, []byte(preparedItem))
	for _, request := range requests[1:] {
		if got := canonicalJSON(t, request.params(t).Item); got != want {
			t.Errorf("%s item = %s, want the prepared item %s", request.Method, got, want)
		}
	}
	if requests[1].Method != "callHierarchy/outgoingCalls" || requests[2].Method != "callHierarchy/incomingCalls" {
		t.Errorf("methods = %s, %s, want outgoingCalls then incomingCalls", requests[1].Method, requests[2].Method)
	}
}

func TestBatchCalls(t *testing.T) {
	item := CallItem{Name: "Serve", Kind: 6, URI: "file:///repo/server.go", raw: []byte(preparedItem)}
	outgoing := func(batch *Batch) ([]Call, error) {
		return batch.OutgoingCalls(item)
	}
	incoming := func(batch *Batch) ([]Call, error) {
		return batch.IncomingCalls(item)
	}
	tests := []struct {
		name   string
		method string
		calls  func(batch *Batch) ([]Call, error)
		answer string
		want   []Call
	}{
		{
			name:   "outgoing null",
			method: "callHierarchy/outgoingCalls",
			calls:  outgoing,
			answer: `null`,
		},
		{
			name:   "outgoing empty list",
			method: "callHierarchy/outgoingCalls",
			calls:  outgoing,
			answer: `[]`,
		},
		{
			name:   "outgoing calls read the callee and the call ranges in the caller",
			method: "callHierarchy/outgoingCalls",
			calls:  outgoing,
			answer: `[{"to":{"name":"helper","kind":12,"uri":"file:///repo/helper.go","range":{"start":{"line":2,"character":0},"end":{"line":8,"character":1}},"selectionRange":{"start":{"line":2,"character":5},"end":{"line":2,"character":11}}},"fromRanges":[{"start":{"line":12,"character":2},"end":{"line":12,"character":8}},{"start":{"line":15,"character":4},"end":{"line":15,"character":10}}]},{"to":{"name":"Close","kind":6,"uri":"file:///repo/server.go","range":{"start":{"line":40,"character":0},"end":{"line":44,"character":1}},"selectionRange":{"start":{"line":40,"character":18},"end":{"line":40,"character":23}}},"fromRanges":[{"start":{"line":18,"character":1},"end":{"line":18,"character":6}}]}]`,
			want: []Call{
				{
					Item:       CallItem{Name: "helper", Kind: 12, URI: "file:///repo/helper.go", Selection: rangeOf(2, 5, 2, 11)},
					FromRanges: []Range{rangeOf(12, 2, 12, 8), rangeOf(15, 4, 15, 10)},
				},
				{
					Item:       CallItem{Name: "Close", Kind: 6, URI: "file:///repo/server.go", Selection: rangeOf(40, 18, 40, 23)},
					FromRanges: []Range{rangeOf(18, 1, 18, 6)},
				},
			},
		},
		{
			name:   "incoming null",
			method: "callHierarchy/incomingCalls",
			calls:  incoming,
			answer: `null`,
		},
		{
			name:   "incoming calls read the caller and the call ranges in the caller",
			method: "callHierarchy/incomingCalls",
			calls:  incoming,
			answer: `[{"from":{"name":"main","kind":12,"uri":"file:///repo/cmd/main.go","range":{"start":{"line":5,"character":0},"end":{"line":9,"character":1}},"selectionRange":{"start":{"line":5,"character":5},"end":{"line":5,"character":9}}},"fromRanges":[{"start":{"line":7,"character":1},"end":{"line":7,"character":6}}]}]`,
			want: []Call{{
				Item:       CallItem{Name: "main", Kind: 12, URI: "file:///repo/cmd/main.go", Selection: rangeOf(5, 5, 5, 9)},
				FromRanges: []Range{rangeOf(7, 1, 7, 6)},
			}},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			client, server := startFakeClient(t, map[string]string{test.method: test.answer})
			got := runBatch(t, client, nil, test.calls)
			if gotFields := callFields(got); !equalOrBothEmpty(gotFields, test.want) {
				t.Errorf("calls =\n%+v\nwant\n%+v", gotFields, test.want)
			}
			requests := server.messagesSinceStart(t, client)
			if len(requests) != 1 || requests[0].Method != test.method {
				t.Errorf("requests = %+v, want one %s request", requests, test.method)
			}
		})
	}
}

func equalOrBothEmpty[T any](got, want []T) bool {
	if len(got) == 0 && len(want) == 0 {
		return true
	}
	return reflect.DeepEqual(got, want)
}

func callItemFields(items []CallItem) []CallItem {
	fields := make([]CallItem, 0, len(items))
	for _, item := range items {
		item.raw = nil
		fields = append(fields, item)
	}
	return fields
}

func callFields(calls []Call) []Call {
	fields := make([]Call, 0, len(calls))
	for _, call := range calls {
		call.Item.raw = nil
		fields = append(fields, call)
	}
	return fields
}

func TestBatchImplementation(t *testing.T) {
	tests := []struct {
		name   string
		answer string
		want   []Location
	}{
		{
			name:   "single location",
			answer: `{"uri":"file:///repo/impl.go","range":{"start":{"line":3,"character":5},"end":{"line":3,"character":12}}}`,
			want:   []Location{{URI: "file:///repo/impl.go", Range: rangeOf(3, 5, 3, 12)}},
		},
		{
			name:   "location list",
			answer: `[{"uri":"file:///repo/impl.go","range":{"start":{"line":3,"character":5},"end":{"line":3,"character":12}}},{"uri":"file:///repo/other.go","range":{"start":{"line":8,"character":0},"end":{"line":8,"character":4}}}]`,
			want: []Location{
				{URI: "file:///repo/impl.go", Range: rangeOf(3, 5, 3, 12)},
				{URI: "file:///repo/other.go", Range: rangeOf(8, 0, 8, 4)},
			},
		},
		{
			name:   "location links use the target selection range",
			answer: `[{"originSelectionRange":{"start":{"line":1,"character":0},"end":{"line":1,"character":3}},"targetUri":"file:///repo/impl.go","targetRange":{"start":{"line":3,"character":0},"end":{"line":9,"character":1}},"targetSelectionRange":{"start":{"line":3,"character":5},"end":{"line":3,"character":12}}}]`,
			want:   []Location{{URI: "file:///repo/impl.go", Range: rangeOf(3, 5, 3, 12)}},
		},
		{
			name:   "location links without a selection range use the target range",
			answer: `[{"targetUri":"file:///repo/impl.go","targetRange":{"start":{"line":3,"character":0},"end":{"line":9,"character":1}}}]`,
			want:   []Location{{URI: "file:///repo/impl.go", Range: rangeOf(3, 0, 9, 1)}},
		},
		{
			name:   "null",
			answer: `null`,
		},
		{
			name:   "empty list",
			answer: `[]`,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			client, server := startFakeClient(t, map[string]string{"textDocument/implementation": test.answer})
			got := runBatch(t, client, nil, func(batch *Batch) ([]Location, error) {
				return batch.Implementation(serverFile, Position{Line: 12, Character: 4})
			})
			if !equalOrBothEmpty(got, test.want) {
				t.Errorf("Implementation() = %+v, want %+v", got, test.want)
			}
			requests := server.messagesSinceStart(t, client)
			if len(requests) != 1 {
				t.Fatalf("requests = %+v, want one implementation request", requests)
			}
			assertPositionRequest(t, requests[0], "textDocument/implementation", sentPosition{Line: 12, Character: 4})
		})
	}
}

func TestBatchReferences(t *testing.T) {
	tests := []struct {
		name   string
		answer string
		want   []Location
	}{
		{
			name:   "location list",
			answer: `[{"uri":"file:///repo/cmd/main.go","range":{"start":{"line":7,"character":1},"end":{"line":7,"character":6}}},{"uri":"file:///repo/server_test.go","range":{"start":{"line":14,"character":2},"end":{"line":14,"character":7}}}]`,
			want: []Location{
				{URI: "file:///repo/cmd/main.go", Range: rangeOf(7, 1, 7, 6)},
				{URI: "file:///repo/server_test.go", Range: rangeOf(14, 2, 14, 7)},
			},
		},
		{
			name:   "null",
			answer: `null`,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			client, server := startFakeClient(t, map[string]string{"textDocument/references": test.answer})
			got := runBatch(t, client, nil, func(batch *Batch) ([]Location, error) {
				return batch.References(serverFile, Position{Line: 10, Character: 19})
			})
			if !equalOrBothEmpty(got, test.want) {
				t.Errorf("References() = %+v, want %+v", got, test.want)
			}
			requests := server.messagesSinceStart(t, client)
			if len(requests) != 1 {
				t.Fatalf("requests = %+v, want one references request", requests)
			}
			assertPositionRequest(t, requests[0], "textDocument/references", sentPosition{Line: 10, Character: 19})
			sentContext := requests[0].params(t).Context
			if sentContext == nil || sentContext.IncludeDeclaration == nil || *sentContext.IncludeDeclaration {
				t.Errorf("references context = %+v, want includeDeclaration false", sentContext)
			}
		})
	}
}

func assertPositionRequest(t *testing.T, request recordedMessage, method string, position sentPosition) {
	t.Helper()
	if !request.isRequest() || request.Method != method {
		t.Errorf("request = %s, want a %s request", request.Method, method)
	}
	params := request.params(t)
	if params.TextDocument.URI != "file:///repo/server.go" {
		t.Errorf("%s uri = %q, want file:///repo/server.go", method, params.TextDocument.URI)
	}
	if params.Position == nil || *params.Position != position {
		t.Errorf("%s position = %+v, want %+v", method, params.Position, position)
	}
}
