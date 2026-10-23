package lsp

import (
	"context"
	"encoding/json/jsontext"
	"errors"
	"testing"
	"testing/synctest"
	"time"
)

const definitionLinks = `[{"originSelectionRange":{"start":{"line":3,"character":4},"end":{"line":3,"character":8}},"targetUri":"file:///repo/c.go","targetRange":{"start":{"line":2,"character":0},"end":{"line":9,"character":1}},"targetSelectionRange":{"start":{"line":2,"character":5},"end":{"line":2,"character":9}}}]`

func TestDefinitionOpensItsDocumentOnlyForTheRequest(t *testing.T) {
	text := "package a\n\nfunc main() {\n\tserve()\n}\n"
	tests := []struct {
		name     string
		results  map[string]string
		failures map[string]string
		want     []Location
		wantErr  bool
	}{
		{
			name:    "a location list",
			results: map[string]string{"textDocument/definition": definitionAnswer},
			want:    []Location{{URI: "file:///repo/b.go", Range: rangeOf(7, 5, 7, 9)}},
		},
		{
			name:    "location links",
			results: map[string]string{"textDocument/definition": definitionLinks},
			want:    []Location{{URI: "file:///repo/c.go", Range: rangeOf(2, 5, 2, 9)}},
		},
		{
			name: "no definition",
		},
		{
			name:     "a failed request",
			failures: map[string]string{"textDocument/definition": definitionFailed},
			wantErr:  true,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			client, server := startFailingFakeClient(t, test.results, test.failures)
			ctx, cancel := context.WithTimeout(t.Context(), testTimeout)
			defer cancel()
			got, err := client.Definition(ctx, goDocument(firstFile, text), definitionPosition)
			if test.wantErr != (err != nil) {
				t.Fatalf("Definition() error = %v, want an error %t", err, test.wantErr)
			}
			if !equalOrBothEmpty(got, test.want) {
				t.Fatalf("Definition() = %+v, want %+v", got, test.want)
			}
			expectSteps(t, documentSteps(t, client, server), []string{
				`textDocument/didOpen file:///repo/a.go v1 "package a\n\nfunc main() {\n\tserve()\n}\n"`,
				"textDocument/definition file:///repo/a.go",
				"textDocument/didClose file:///repo/a.go",
			})
			messages := server.messagesSinceStart(t, client)
			if languageID := messages[0].params(t).TextDocument.LanguageID; languageID != "go" {
				t.Errorf("didOpen language = %q, want go", languageID)
			}
			if !messages[1].isRequest() {
				t.Errorf("definition was sent as a notification")
			}
			if position := messages[1].params(t).Position; position == nil || *position != (sentPosition{Line: 3, Character: 4}) {
				t.Errorf("definition position = %+v, want line 3 character 4", position)
			}
		})
	}
}

func TestDefinitionOpensADocumentAgainAfterItsRequest(t *testing.T) {
	client, server := startFakeClient(t, nil)
	ctx, cancel := context.WithTimeout(t.Context(), testTimeout)
	defer cancel()
	for _, text := range []string{"one", "two"} {
		if _, err := client.Definition(ctx, goDocument(firstFile, text), definitionPosition); err != nil {
			t.Fatalf("Definition(%q) error = %v", text, err)
		}
	}
	expectSteps(t, documentSteps(t, client, server), []string{
		`textDocument/didOpen file:///repo/a.go v1 "one"`,
		"textDocument/definition file:///repo/a.go",
		"textDocument/didClose file:///repo/a.go",
		`textDocument/didOpen file:///repo/a.go v1 "two"`,
		"textDocument/definition file:///repo/a.go",
		"textDocument/didClose file:///repo/a.go",
	})
}

func TestDefinitionWaitsForTheSessionSlot(t *testing.T) {
	tests := []struct {
		name      string
		release   bool
		wantErr   error
		wantSteps []string
	}{
		{
			name:    "the slot frees up before the deadline",
			release: true,
			wantSteps: []string{
				`textDocument/didOpen file:///repo/a.go v1 "package a\n"`,
				"textDocument/definition file:///repo/a.go",
				"textDocument/didClose file:///repo/a.go",
			},
		},
		{
			name:    "the deadline passes first",
			wantErr: context.DeadlineExceeded,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			synctest.Test(t, func(t *testing.T) {
				client, server := startFakeClient(t, map[string]string{"textDocument/definition": definitionAnswer})
				client.slot <- struct{}{}
				ctx, cancel := context.WithTimeout(t.Context(), 2*time.Second)
				defer cancel()
				done := make(chan error, 1)
				go func() {
					_, err := client.Definition(ctx, goDocument(firstFile, "package a\n"), definitionPosition)
					done <- err
				}()
				synctest.Wait()
				expectSteps(t, documentSteps(t, client, server), nil)
				if test.release {
					<-client.slot
				}
				if err := await(t, done); !errors.Is(err, test.wantErr) {
					t.Fatalf("Definition() error = %v, want %v", err, test.wantErr)
				}
				if !test.release {
					<-client.slot
				}
				expectSteps(t, documentSteps(t, client, server), test.wantSteps)
			})
		})
	}
}

func TestDefinitionSendsNothingForAContextThatAlreadyEnded(t *testing.T) {
	client, server := startFakeClient(t, map[string]string{"textDocument/definition": definitionAnswer})
	ctx, cancel := context.WithCancel(t.Context())
	cancel()
	if _, err := client.Definition(ctx, goDocument(firstFile, "package a\n"), definitionPosition); !errors.Is(err, context.Canceled) {
		t.Fatalf("Definition() error = %v, want context.Canceled", err)
	}
	expectSteps(t, documentSteps(t, client, server), nil)
}

func TestParseLocationsAcceptsEveryDefinitionShape(t *testing.T) {
	location := `{"uri":"file:///repo/a.go","range":{"start":{"line":1,"character":2},"end":{"line":1,"character":5}}}`
	link := `{"targetUri":"file:///repo/b.go","targetRange":{"start":{"line":3,"character":0},"end":{"line":9,"character":1}},"targetSelectionRange":{"start":{"line":3,"character":5},"end":{"line":3,"character":12}}}`
	locationA := Location{URI: "file:///repo/a.go", Range: rangeOf(1, 2, 1, 5)}
	locationB := Location{URI: "file:///repo/b.go", Range: rangeOf(3, 5, 3, 12)}
	tests := []struct {
		name    string
		raw     string
		want    []Location
		wantErr bool
	}{
		{name: "a single location inside whitespace", raw: "\n  " + location + "\n", want: []Location{locationA}},
		{name: "a single location link", raw: link, want: []Location{locationB}},
		{name: "locations and links in one list", raw: " [" + location + "," + link + "] ", want: []Location{locationA, locationB}},
		{name: "null inside whitespace", raw: " null "},
		{name: "no result at all", raw: ""},
		{name: "a value that is neither a location nor a list", raw: `"file:///repo/a.go"`, wantErr: true},
		{name: "a truncated list", raw: `[{"uri":`, wantErr: true},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := parseLocations(jsontext.Value(test.raw))
			if test.wantErr != (err != nil) {
				t.Fatalf("parseLocations() error = %v, want an error %t", err, test.wantErr)
			}
			if !equalOrBothEmpty(got, test.want) {
				t.Fatalf("parseLocations() = %+v, want %+v", got, test.want)
			}
		})
	}
}
