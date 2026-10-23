package lsp

import (
	"context"
	"encoding/json/jsontext"
	"encoding/json/v2"
	"errors"
	"slices"
	"testing"
)

func TestStartDetectsFlowCapabilities(t *testing.T) {
	tests := []struct {
		name         string
		capabilities string
		want         Capabilities
	}{
		{
			name:         "no providers",
			capabilities: `{}`,
			want:         Capabilities{},
		},
		{
			name:         "every provider as true",
			capabilities: `{"documentSymbolProvider":true,"callHierarchyProvider":true,"implementationProvider":true,"referencesProvider":true}`,
			want:         Capabilities{DocumentSymbols: true, CallHierarchy: true, Implementation: true, References: true},
		},
		{
			name:         "every provider as an options object",
			capabilities: `{"documentSymbolProvider":{"label":"gopls"},"callHierarchyProvider":{},"implementationProvider":{"workDoneProgress":true},"referencesProvider":{"workDoneProgress":false}}`,
			want:         Capabilities{DocumentSymbols: true, CallHierarchy: true, Implementation: true, References: true},
		},
		{
			name:         "registration options count as provided",
			capabilities: `{"callHierarchyProvider":{"documentSelector":null,"id":"call-hierarchy"},"implementationProvider":{"documentSelector":[{"language":"go"}]}}`,
			want:         Capabilities{CallHierarchy: true, Implementation: true},
		},
		{
			name:         "every provider as false",
			capabilities: `{"documentSymbolProvider":false,"callHierarchyProvider":false,"implementationProvider":false,"referencesProvider":false}`,
			want:         Capabilities{},
		},
		{
			name:         "every provider as null",
			capabilities: `{"documentSymbolProvider":null,"callHierarchyProvider":null,"implementationProvider":null,"referencesProvider":null}`,
			want:         Capabilities{},
		},
		{
			name:         "document symbols only",
			capabilities: `{"documentSymbolProvider":true,"callHierarchyProvider":false}`,
			want:         Capabilities{DocumentSymbols: true},
		},
		{
			name:         "call hierarchy only",
			capabilities: `{"callHierarchyProvider":true,"documentSymbolProvider":false}`,
			want:         Capabilities{CallHierarchy: true},
		},
		{
			name:         "implementation only",
			capabilities: `{"implementationProvider":{},"referencesProvider":null}`,
			want:         Capabilities{Implementation: true},
		},
		{
			name:         "references only",
			capabilities: `{"referencesProvider":true,"implementationProvider":false}`,
			want:         Capabilities{References: true},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			client, _ := startFakeClient(t, map[string]string{
				"initialize": `{"capabilities":` + test.capabilities + `}`,
			})
			if got := client.Capabilities(); got != test.want {
				t.Errorf("Capabilities() = %+v, want %+v", got, test.want)
			}
		})
	}
}

func TestStartAdvertisesFlowRequestsBeforeInitialized(t *testing.T) {
	client, server := startFakeClient(t, nil)
	messages := server.messages(t, client)
	methods := make([]string, 0, len(messages))
	for _, message := range messages {
		methods = append(methods, message.Method)
	}
	if want := []string{"initialize", "initialized"}; !slices.Equal(methods, want) {
		t.Fatalf("methods = %v, want %v", methods, want)
	}
	if !messages[0].isRequest() || messages[1].isRequest() {
		t.Fatalf("initialize must be a request and initialized a notification")
	}
	var initialize struct {
		RootURI      string `json:"rootUri"`
		Capabilities struct {
			TextDocument struct {
				DocumentSymbol *struct {
					Hierarchical bool `json:"hierarchicalDocumentSymbolSupport"`
				} `json:"documentSymbol"`
				CallHierarchy  jsontext.Value `json:"callHierarchy"`
				Implementation *struct {
					LinkSupport bool `json:"linkSupport"`
				} `json:"implementation"`
				References jsontext.Value `json:"references"`
			} `json:"textDocument"`
		} `json:"capabilities"`
	}
	if err := json.Unmarshal(messages[0].Params, &initialize); err != nil {
		t.Fatalf("decode initialize params: %v", err)
	}
	if initialize.RootURI != "file:///repo" {
		t.Errorf("rootUri = %q, want file:///repo", initialize.RootURI)
	}
	textDocument := initialize.Capabilities.TextDocument
	if textDocument.DocumentSymbol == nil || !textDocument.DocumentSymbol.Hierarchical {
		t.Errorf("documentSymbol capability does not ask for hierarchical symbols")
	}
	if len(textDocument.CallHierarchy) == 0 {
		t.Errorf("callHierarchy capability is missing")
	}
	if textDocument.Implementation == nil || !textDocument.Implementation.LinkSupport {
		t.Errorf("implementation capability does not accept location links")
	}
	if len(textDocument.References) == 0 {
		t.Errorf("references capability is missing")
	}
}

var errWorkFailed = errors.New("work failed")

func TestBatchOpensAndClosesEveryDocumentOnce(t *testing.T) {
	documents := []Document{
		{Path: "/repo/a.go", LanguageID: "go", Text: "package a\n"},
		{Path: "/repo/b.go", LanguageID: "go", Text: "package b\n"},
	}
	tests := []struct {
		name      string
		work      func(batch *Batch) error
		wantErr   error
		wantSteps []string
	}{
		{
			name: "work with several requests",
			work: func(batch *Batch) error {
				if _, err := batch.Symbols("/repo/a.go"); err != nil {
					return err
				}
				if _, err := batch.Symbols("/repo/b.go"); err != nil {
					return err
				}
				_, err := batch.PrepareCallHierarchy("/repo/a.go", Position{Line: 2, Character: 5})
				return err
			},
			wantSteps: []string{
				"textDocument/didOpen file:///repo/a.go",
				"textDocument/didOpen file:///repo/b.go",
				"textDocument/documentSymbol file:///repo/a.go",
				"textDocument/documentSymbol file:///repo/b.go",
				"textDocument/prepareCallHierarchy file:///repo/a.go",
				"textDocument/didClose file:///repo/a.go",
				"textDocument/didClose file:///repo/b.go",
			},
		},
		{
			name: "work that fails after a request",
			work: func(batch *Batch) error {
				if _, err := batch.Symbols("/repo/a.go"); err != nil {
					return err
				}
				return errWorkFailed
			},
			wantErr: errWorkFailed,
			wantSteps: []string{
				"textDocument/didOpen file:///repo/a.go",
				"textDocument/didOpen file:///repo/b.go",
				"textDocument/documentSymbol file:///repo/a.go",
				"textDocument/didClose file:///repo/a.go",
				"textDocument/didClose file:///repo/b.go",
			},
		},
		{
			name: "work that fails before any request",
			work: func(*Batch) error {
				return errWorkFailed
			},
			wantErr: errWorkFailed,
			wantSteps: []string{
				"textDocument/didOpen file:///repo/a.go",
				"textDocument/didOpen file:///repo/b.go",
				"textDocument/didClose file:///repo/a.go",
				"textDocument/didClose file:///repo/b.go",
			},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			client, server := startFakeClient(t, nil)
			ctx, cancel := context.WithTimeout(t.Context(), testTimeout)
			defer cancel()
			err := client.Batch(ctx, documents, test.work)
			if !errors.Is(err, test.wantErr) {
				t.Fatalf("Batch() error = %v, want %v", err, test.wantErr)
			}
			messages := server.messagesSinceStart(t, client)
			steps := make([]string, 0, len(messages))
			for _, message := range messages {
				steps = append(steps, message.step(t))
			}
			if !slices.Equal(steps, test.wantSteps) {
				t.Fatalf("steps =\n%q\nwant\n%q", steps, test.wantSteps)
			}
			for index, document := range documents {
				opened := messages[index].params(t).TextDocument
				if opened.LanguageID != document.LanguageID || opened.Version != 1 || opened.Text != document.Text {
					t.Errorf("didOpen %s = %+v, want language %q, version 1 and the document text", document.Path, opened, document.LanguageID)
				}
			}
		})
	}
}
