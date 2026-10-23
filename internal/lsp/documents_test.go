package lsp

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"
	"sync"
	"testing"
)

const (
	firstFile        = "/repo/a.go"
	secondFile       = "/repo/b.go"
	thirdFile        = "/repo/c.go"
	definitionAnswer = `[{"uri":"file:///repo/b.go","range":{"start":{"line":7,"character":5},"end":{"line":7,"character":9}}}]`
	definitionFailed = `{"code":-32603,"message":"definition failed"}`
)

var definitionPosition = Position{Line: 3, Character: 4}

func goDocument(path, text string) Document {
	return Document{Path: path, LanguageID: "go", Text: text}
}

func documentSteps(t *testing.T, client *Client, server *fakeServer) []string {
	t.Helper()
	messages := server.messagesSinceStart(t, client)
	steps := make([]string, 0, len(messages))
	for _, message := range messages {
		params := message.params(t)
		step := message.step(t)
		switch message.Method {
		case "textDocument/didOpen":
			step += fmt.Sprintf(" v%d %q", params.TextDocument.Version, params.TextDocument.Text)
		case "textDocument/didChange":
			texts := make([]string, 0, len(params.ContentChanges))
			for _, change := range params.ContentChanges {
				texts = append(texts, change.Text)
			}
			step += fmt.Sprintf(" v%d %q", params.TextDocument.Version, strings.Join(texts, ""))
		}
		steps = append(steps, step)
	}
	return steps
}

func expectSteps(t *testing.T, got, want []string) {
	t.Helper()
	if !slices.Equal(got, want) {
		t.Fatalf("steps =\n%q\nwant\n%q", got, want)
	}
}

func TestDefinitionRunsBetweenTheRequestsOfABatch(t *testing.T) {
	client, server := startFakeClient(t, map[string]string{"textDocument/definition": definitionAnswer})
	ctx, cancel := context.WithTimeout(t.Context(), testTimeout)
	defer cancel()
	var locations []Location
	err := client.Batch(ctx, []Document{goDocument(firstFile, "package a\n")}, func(batch *Batch) error {
		if _, err := batch.Symbols(firstFile); err != nil {
			return err
		}
		var definitionErr error
		var other sync.WaitGroup
		other.Go(func() {
			locations, definitionErr = client.Definition(ctx, goDocument(secondFile, "package b\n"), definitionPosition)
		})
		other.Wait()
		if definitionErr != nil {
			return definitionErr
		}
		_, err := batch.Symbols(firstFile)
		return err
	})
	if err != nil {
		t.Fatalf("Batch() error = %v", err)
	}
	want := []Location{{URI: "file:///repo/b.go", Range: rangeOf(7, 5, 7, 9)}}
	if !slices.Equal(locations, want) {
		t.Errorf("Definition() = %+v, want %+v", locations, want)
	}
	expectSteps(t, documentSteps(t, client, server), []string{
		`textDocument/didOpen file:///repo/a.go v1 "package a\n"`,
		"textDocument/documentSymbol file:///repo/a.go",
		`textDocument/didOpen file:///repo/b.go v1 "package b\n"`,
		"textDocument/definition file:///repo/b.go",
		"textDocument/didClose file:///repo/b.go",
		"textDocument/documentSymbol file:///repo/a.go",
		"textDocument/didClose file:///repo/a.go",
	})
}

func TestSharedDocumentsOpenOnceAndCloseAfterTheirLastUser(t *testing.T) {
	first := goDocument(firstFile, "package a\n")
	tests := []struct {
		name      string
		documents []Document
		work      func(ctx context.Context, client *Client, batch *Batch) error
		wantSteps []string
	}{
		{
			name:      "a batch that lists a document twice",
			documents: []Document{first, first},
			work: func(_ context.Context, _ *Client, batch *Batch) error {
				_, err := batch.Symbols(firstFile)
				return err
			},
			wantSteps: []string{
				`textDocument/didOpen file:///repo/a.go v1 "package a\n"`,
				"textDocument/documentSymbol file:///repo/a.go",
				"textDocument/didClose file:///repo/a.go",
			},
		},
		{
			name:      "a batch inside another batch over the same document",
			documents: []Document{first},
			work: func(ctx context.Context, client *Client, batch *Batch) error {
				if _, err := batch.Symbols(firstFile); err != nil {
					return err
				}
				err := client.Batch(ctx, []Document{first}, func(inner *Batch) error {
					_, err := inner.Symbols(firstFile)
					return err
				})
				if err != nil {
					return err
				}
				_, err = batch.Symbols(firstFile)
				return err
			},
			wantSteps: []string{
				`textDocument/didOpen file:///repo/a.go v1 "package a\n"`,
				"textDocument/documentSymbol file:///repo/a.go",
				"textDocument/documentSymbol file:///repo/a.go",
				"textDocument/documentSymbol file:///repo/a.go",
				"textDocument/didClose file:///repo/a.go",
			},
		},
		{
			name:      "a batch inside another batch with a document of its own",
			documents: []Document{first},
			work: func(ctx context.Context, client *Client, batch *Batch) error {
				err := client.Batch(ctx, []Document{first, goDocument(thirdFile, "package c\n")}, func(inner *Batch) error {
					_, err := inner.Symbols(thirdFile)
					return err
				})
				if err != nil {
					return err
				}
				_, err = batch.Symbols(firstFile)
				return err
			},
			wantSteps: []string{
				`textDocument/didOpen file:///repo/a.go v1 "package a\n"`,
				`textDocument/didOpen file:///repo/c.go v1 "package c\n"`,
				"textDocument/documentSymbol file:///repo/c.go",
				"textDocument/didClose file:///repo/c.go",
				"textDocument/documentSymbol file:///repo/a.go",
				"textDocument/didClose file:///repo/a.go",
			},
		},
		{
			name:      "a definition on a document a batch holds with the same text",
			documents: []Document{first},
			work: func(ctx context.Context, client *Client, batch *Batch) error {
				if _, err := client.Definition(ctx, first, definitionPosition); err != nil {
					return err
				}
				_, err := batch.Symbols(firstFile)
				return err
			},
			wantSteps: []string{
				`textDocument/didOpen file:///repo/a.go v1 "package a\n"`,
				"textDocument/definition file:///repo/a.go",
				"textDocument/documentSymbol file:///repo/a.go",
				"textDocument/didClose file:///repo/a.go",
			},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			client, server := startFakeClient(t, nil)
			ctx, cancel := context.WithTimeout(t.Context(), testTimeout)
			defer cancel()
			err := client.Batch(ctx, test.documents, func(batch *Batch) error {
				return test.work(ctx, client, batch)
			})
			if err != nil {
				t.Fatalf("Batch() error = %v", err)
			}
			expectSteps(t, documentSteps(t, client, server), test.wantSteps)
		})
	}
}

func TestBatchSendsItsTextBackAfterAnotherBatchReplacedIt(t *testing.T) {
	client, server := startFakeClient(t, nil)
	ctx, cancel := context.WithTimeout(t.Context(), testTimeout)
	defer cancel()
	outerDocuments := []Document{goDocument(firstFile, "one"), goDocument(secondFile, "package b\n")}
	err := client.Batch(ctx, outerDocuments, func(outer *Batch) error {
		if _, err := outer.Symbols(firstFile); err != nil {
			return err
		}
		err := client.Batch(ctx, []Document{goDocument(firstFile, "two")}, func(inner *Batch) error {
			if _, err := inner.Symbols(firstFile); err != nil {
				return err
			}
			if _, err := outer.Symbols(firstFile); err != nil {
				return err
			}
			_, err := inner.Symbols(firstFile)
			return err
		})
		if err != nil {
			return err
		}
		_, err = outer.Symbols(firstFile)
		return err
	})
	if err != nil {
		t.Fatalf("Batch() error = %v", err)
	}
	expectSteps(t, documentSteps(t, client, server), []string{
		`textDocument/didOpen file:///repo/a.go v1 "one"`,
		`textDocument/didOpen file:///repo/b.go v1 "package b\n"`,
		"textDocument/documentSymbol file:///repo/a.go",
		`textDocument/didChange file:///repo/a.go v2 "two"`,
		"textDocument/documentSymbol file:///repo/a.go",
		`textDocument/didChange file:///repo/a.go v3 "one"`,
		"textDocument/documentSymbol file:///repo/a.go",
		`textDocument/didChange file:///repo/a.go v4 "two"`,
		"textDocument/documentSymbol file:///repo/a.go",
		`textDocument/didChange file:///repo/a.go v5 "one"`,
		"textDocument/documentSymbol file:///repo/a.go",
		"textDocument/didClose file:///repo/a.go",
		"textDocument/didClose file:///repo/b.go",
	})
}

func TestDefinitionSwapsTheTextOfAHeldDocumentAndRestoresIt(t *testing.T) {
	tests := []struct {
		name     string
		failures map[string]string
		wantErr  bool
	}{
		{
			name: "answered definition",
		},
		{
			name:     "failed definition",
			failures: map[string]string{"textDocument/definition": definitionFailed},
			wantErr:  true,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			client, server := startFailingFakeClient(t, map[string]string{"textDocument/definition": definitionAnswer}, test.failures)
			ctx, cancel := context.WithTimeout(t.Context(), testTimeout)
			defer cancel()
			var definitionErr error
			err := client.Batch(ctx, []Document{goDocument(firstFile, "one")}, func(batch *Batch) error {
				if _, err := batch.Symbols(firstFile); err != nil {
					return err
				}
				_, definitionErr = client.Definition(ctx, goDocument(firstFile, "two"), definitionPosition)
				_, err := batch.Symbols(firstFile)
				return err
			})
			if err != nil {
				t.Fatalf("Batch() error = %v", err)
			}
			if test.wantErr {
				if responseErr, ok := errors.AsType[*ResponseError](definitionErr); !ok || responseErr.Code != -32603 {
					t.Errorf("Definition() error = %v, want the server's -32603 error", definitionErr)
				}
			} else if definitionErr != nil {
				t.Errorf("Definition() error = %v", definitionErr)
			}
			expectSteps(t, documentSteps(t, client, server), []string{
				`textDocument/didOpen file:///repo/a.go v1 "one"`,
				"textDocument/documentSymbol file:///repo/a.go",
				`textDocument/didChange file:///repo/a.go v2 "two"`,
				"textDocument/definition file:///repo/a.go",
				`textDocument/didChange file:///repo/a.go v3 "one"`,
				"textDocument/documentSymbol file:///repo/a.go",
				"textDocument/didClose file:///repo/a.go",
			})
		})
	}
}
