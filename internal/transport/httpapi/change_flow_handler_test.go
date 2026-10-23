package httpapi

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"path"
	"strings"
	"testing"

	"github.com/obsfx/oversee/internal/catalog"
	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/gdscript"
	"github.com/obsfx/oversee/internal/langserver"
	"github.com/obsfx/oversee/internal/lsp"
	"github.com/obsfx/oversee/internal/service"
)

const localHost = "127.0.0.1:6999"

var errLanguageServerStarted = errors.New("a language server must not start in this test")

type flowGitStub struct {
	current string
	changes []domain.LineChanges
	err     error
}

func (g flowGitStub) CurrentBranch(context.Context) (string, error) {
	return g.current, nil
}

func (g flowGitStub) ChangedLines(context.Context, domain.Comparison) ([]domain.LineChanges, error) {
	return g.changes, g.err
}

func (g flowGitStub) ContentsOf(context.Context, domain.Comparison, domain.FileSide, []string, int64) (map[string]domain.Blob, error) {
	return map[string]domain.Blob{}, nil
}

func (g flowGitStub) TrackedPaths(context.Context, domain.Comparison) ([]string, error) {
	return nil, nil
}

type installationsStub map[string]langserver.Installation

func (s installationsStub) Find(id string) (langserver.Installation, bool, error) {
	installation, found := s[id]
	return installation, found, nil
}

type forbiddenLauncher struct {
	t *testing.T
}

func (l forbiddenLauncher) Start(context.Context, langserver.Installation, catalog.Run, string) (*langserver.Process, map[string]any, error) {
	l.t.Error("started a language server process")
	return nil, nil, errLanguageServerStarted
}

type forbiddenSessions struct {
	t *testing.T
}

func (s forbiddenSessions) Client(context.Context, lsp.Launch) (*lsp.Client, error) {
	s.t.Error("opened a language server session")
	return nil, errLanguageServerStarted
}

type projectStub struct{}

func (projectStub) Path(relative string) string {
	return path.Join("/repo", relative)
}

func (projectStub) RootOf(string, []string) string {
	return "/repo"
}

func (projectStub) Relative(string) (string, bool) {
	return "", false
}

func goplsCatalog() catalog.Catalog {
	return catalog.Catalog{
		SchemaVersion: catalog.SchemaVersion,
		FileTypes:     map[string]catalog.FileType{"go": {Extensions: []string{"go"}, Server: "gopls"}},
		Servers:       []catalog.Server{{ID: "gopls", Version: "0.20.0", FileTypes: []string{"go"}, Run: catalog.Run{Bin: "gopls"}}},
	}
}

func newChangeFlowAPI(t *testing.T, git flowGitStub, installed installationsStub) http.Handler {
	t.Helper()
	flows := service.NewChangeFlowService(goplsCatalog(), git, installed, forbiddenLauncher{t: t}, projectStub{}, forbiddenSessions{t: t}, gdscript.NewAnalyzer())
	t.Cleanup(flows.Close)
	server := New(Config{Services: service.Services{Flows: flows}})
	return localOnly(http.NewCrossOriginProtection().Handler(server.routes()))
}

func changeFlowRequest(t *testing.T, method, host string, comparison url.Values) *http.Request {
	t.Helper()
	request := httptest.NewRequestWithContext(t.Context(), method, "/api/change-flow?"+comparison.Encode(), nil)
	request.Host = host
	return request
}

func modifiedFile(filePath string) domain.LineChanges {
	return domain.LineChanges{Path: filePath, Status: domain.ChangeModified, Hunks: []domain.LineHunk{{OldStart: 3, OldLines: 1, NewStart: 3, NewLines: 2}}}
}

func TestChangeFlowHandler(t *testing.T) {
	uncommitted := url.Values{"source": {domain.UncommittedSource}, "target": {"main"}}
	featureBranch := url.Values{"source": {"feature"}, "target": {"main"}}
	tests := []struct {
		name       string
		comparison url.Values
		git        flowGitStub
		installed  installationsStub
		wantStatus int
		wantBody   string
	}{
		{
			name:       "empty source is an invalid comparison",
			comparison: url.Values{"target": {"main"}},
			git:        flowGitStub{current: "main"},
			wantStatus: http.StatusBadRequest,
			wantBody:   `{"error":"source must be a git ref"}`,
		},
		{
			name:       "gone ref",
			comparison: featureBranch,
			git:        flowGitStub{current: "main", err: fmt.Errorf("resolve feature: %w", domain.ErrUnknownBranch)},
			wantStatus: http.StatusNotFound,
			wantBody:   `{"error":"resolve feature: branch does not exist"}`,
		},
		{
			name:       "no changed files",
			comparison: uncommitted,
			git:        flowGitStub{current: "main"},
			wantStatus: http.StatusOK,
			wantBody:   `{"servers":[],"nodes":[],"edges":[],"origins":{}}`,
		},
		{
			name:       "changed files without a server or with a server that is not installed",
			comparison: uncommitted,
			git:        flowGitStub{current: "main", changes: []domain.LineChanges{modifiedFile("cmd/main.go"), modifiedFile("README.md")}},
			wantStatus: http.StatusOK,
			wantBody:   `{"servers":[{"server":"gopls","status":"not-installed","error":""}],"nodes":[],"edges":[],"origins":{}}`,
		},
		{
			name:       "installed server on a branch that is not checked out",
			comparison: featureBranch,
			git:        flowGitStub{current: "main", changes: []domain.LineChanges{modifiedFile("cmd/main.go")}},
			installed:  installationsStub{"gopls": {ID: "gopls", Version: "0.20.0"}},
			wantStatus: http.StatusOK,
			wantBody:   `{"servers":[{"server":"gopls","status":"needs-checkout","error":""}],"nodes":[],"edges":[],"origins":{}}`,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			api := newChangeFlowAPI(t, test.git, test.installed)
			recorder := httptest.NewRecorder()
			api.ServeHTTP(recorder, changeFlowRequest(t, http.MethodGet, localHost, test.comparison))
			if recorder.Code != test.wantStatus {
				t.Errorf("status = %d, want %d", recorder.Code, test.wantStatus)
			}
			if contentType := recorder.Header().Get("Content-Type"); contentType != "application/json" {
				t.Errorf("Content-Type = %q, want application/json", contentType)
			}
			if body := strings.TrimSpace(recorder.Body.String()); body != test.wantBody {
				t.Errorf("body =\n%s\nwant\n%s", body, test.wantBody)
			}
		})
	}
}

func TestChangeFlowRequestGuards(t *testing.T) {
	tests := []struct {
		name       string
		method     string
		host       string
		wantStatus int
	}{
		{name: "cross-site GET is rejected", method: http.MethodGet, host: localHost, wantStatus: http.StatusForbidden},
		{name: "cross-site POST is rejected", method: http.MethodPost, host: localHost, wantStatus: http.StatusForbidden},
		{name: "GET to a host that is not local is rejected", method: http.MethodGet, host: "oversee.example:6999", wantStatus: http.StatusForbidden},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			api := newChangeFlowAPI(t, flowGitStub{current: "main"}, nil)
			request := changeFlowRequest(t, test.method, test.host, url.Values{"source": {domain.UncommittedSource}, "target": {"main"}})
			request.Header.Set("Sec-Fetch-Site", "cross-site")
			request.Header.Set("Origin", "https://attacker.example")
			recorder := httptest.NewRecorder()
			api.ServeHTTP(recorder, request)
			if recorder.Code != test.wantStatus {
				t.Errorf("status = %d, want %d (body %s)", recorder.Code, test.wantStatus, strings.TrimSpace(recorder.Body.String()))
			}
		})
	}
}
