package httpapi

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"slices"
	"strings"
	"testing"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/gdscript"
	"github.com/obsfx/oversee/internal/langserver"
	"github.com/obsfx/oversee/internal/lsp"
	"github.com/obsfx/oversee/internal/service"
	"github.com/obsfx/oversee/internal/transport/dto"
)

type forbiddenDefinitionGit struct {
	t *testing.T
}

func (g forbiddenDefinitionGit) CurrentBranch(context.Context) (string, error) {
	g.t.Error("read the current branch")
	return "", errLanguageServerStarted
}

func (g forbiddenDefinitionGit) Contents(context.Context, domain.Comparison, string, domain.FileSide) (domain.Blob, error) {
	g.t.Error("read git contents")
	return nil, errLanguageServerStarted
}

func (g forbiddenDefinitionGit) ChangedPaths(context.Context, string, string) ([]string, error) {
	g.t.Error("read changed paths")
	return nil, errLanguageServerStarted
}

type forbiddenPool struct {
	forbiddenSessions
}

func (p forbiddenPool) FilesChanged([]lsp.FileEvent) {
	p.t.Error("notified a language server session")
}

func (p forbiddenPool) Stop(string) {
	p.t.Error("stopped a language server session")
}

func newGuardedAPI(t *testing.T, repo string) http.Handler {
	t.Helper()
	definitions := service.NewDefinitionService(goplsCatalog(), forbiddenDefinitionGit{t: t}, installationsStub(nil), forbiddenLauncher{t: t}, langserver.NewProject(repo), forbiddenPool{forbiddenSessions{t: t}})
	flows := service.NewChangeFlowService(goplsCatalog(), flowGitStub{current: "main"}, installationsStub(nil), forbiddenLauncher{t: t}, projectStub{}, forbiddenSessions{t: t}, gdscript.NewAnalyzer())
	t.Cleanup(flows.Close)
	return New(Config{Services: service.Services{Definitions: definitions, Flows: flows}}).handler()
}

func serveRequest(t *testing.T, handler http.Handler, method, target, host string, headers map[string]string) *httptest.ResponseRecorder {
	t.Helper()
	request := httptest.NewRequestWithContext(t.Context(), method, target, nil)
	request.Host = host
	for name, value := range headers {
		request.Header.Set(name, value)
	}
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	return recorder
}

func TestLocalHostGuard(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})
	tests := []struct {
		host string
		want int
	}{
		{host: "localhost:6999", want: http.StatusNoContent},
		{host: "127.0.0.1:6999", want: http.StatusNoContent},
		{host: "[::1]:6999", want: http.StatusNoContent},
		{host: "localhost", want: http.StatusNoContent},
		{host: "127.0.0.1", want: http.StatusNoContent},
		{host: "attacker.example:6999", want: http.StatusForbidden},
		{host: "attacker.example", want: http.StatusForbidden},
		{host: "localhost.attacker.example:6999", want: http.StatusForbidden},
		{host: "127.0.0.1.nip.io:6999", want: http.StatusForbidden},
		{host: "0.0.0.0:6999", want: http.StatusForbidden},
		{host: "192.168.1.20:6999", want: http.StatusForbidden},
		{host: "127.0.0.2:6999", want: http.StatusForbidden},
		{host: "", want: http.StatusForbidden},
	}
	for _, test := range tests {
		t.Run(test.host, func(t *testing.T) {
			recorder := serveRequest(t, localOnly(next), http.MethodGet, "/api/workspace", test.host, nil)
			if recorder.Code != test.want {
				t.Errorf("status = %d, want %d", recorder.Code, test.want)
			}
			if test.want == http.StatusForbidden && strings.TrimSpace(recorder.Body.String()) != "forbidden host" {
				t.Errorf("body = %q, want forbidden host", recorder.Body.String())
			}
		})
	}
	t.Run("every route is behind the guard", func(t *testing.T) {
		api := newLanguageServerAPI(t, nil)
		for _, route := range []struct{ method, target string }{
			{method: http.MethodGet, target: "/api/workspace"},
			{method: http.MethodGet, target: "/api/language-servers"},
			{method: http.MethodPost, target: "/api/language-servers/gopls/install"},
		} {
			recorder := serveRequest(t, api.handler, route.method, route.target, "rebind.attacker.example:6999", nil)
			if recorder.Code != http.StatusForbidden {
				t.Errorf("%s %s status = %d, want 403", route.method, route.target, recorder.Code)
			}
		}
		if got := api.installer.installed(); len(got) != 0 {
			t.Errorf("installer ran for %v through a foreign host", got)
		}
	})
}

func TestCrossOriginProtection(t *testing.T) {
	tests := []struct {
		name          string
		headers       map[string]string
		wantStatus    int
		wantInstalled []string
	}{
		{name: "cross-site", headers: map[string]string{"Sec-Fetch-Site": "cross-site"}, wantStatus: http.StatusForbidden},
		{name: "same-site page on another localhost port", headers: map[string]string{"Sec-Fetch-Site": "same-site", "Origin": "http://localhost:5173"}, wantStatus: http.StatusForbidden},
		{name: "an old browser with a foreign origin", headers: map[string]string{"Origin": "http://localhost:5173"}, wantStatus: http.StatusForbidden},
		{name: "an opaque origin", headers: map[string]string{"Origin": "null"}, wantStatus: http.StatusForbidden},
		{name: "same-origin", headers: map[string]string{"Sec-Fetch-Site": "same-origin", "Origin": "http://" + localHost}, wantStatus: http.StatusAccepted, wantInstalled: []string{"gopls"}},
		{name: "a user initiated request", headers: map[string]string{"Sec-Fetch-Site": "none"}, wantStatus: http.StatusAccepted, wantInstalled: []string{"gopls"}},
		{name: "an old browser with the same origin", headers: map[string]string{"Origin": "http://" + localHost}, wantStatus: http.StatusAccepted, wantInstalled: []string{"gopls"}},
		{name: "a client without browser headers", wantStatus: http.StatusAccepted, wantInstalled: []string{"gopls"}},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			api := newLanguageServerAPI(t, nil)
			recorder := serveRequest(t, api.handler, http.MethodPost, "/api/language-servers/gopls/install", localHost, test.headers)
			requireStatus(t, recorder, test.wantStatus)
			for _, id := range test.wantInstalled {
				api.installer.waitStarted(t, id)
			}
			if got := api.installer.installed(); !slices.Equal(got, test.wantInstalled) {
				t.Errorf("installer ran for %v, want %v", got, test.wantInstalled)
			}
		})
	}
	t.Run("cross-site removal and cancel", func(t *testing.T) {
		api := newLanguageServerAPI(t, map[string]string{"gopls": "0.20.0"})
		for _, target := range []string{"/api/language-servers/gopls", "/api/language-servers/gopls/install"} {
			recorder := serveRequest(t, api.handler, http.MethodDelete, target, localHost, map[string]string{"Sec-Fetch-Site": "cross-site"})
			requireStatus(t, recorder, http.StatusForbidden)
		}
		if got := api.store.removedIDs(); len(got) != 0 {
			t.Errorf("removed %v from a cross-site request", got)
		}
	})
}

func TestSameOriginGuard(t *testing.T) {
	api := newGuardedAPI(t, t.TempDir())
	routes := []struct {
		target   string
		wantBody string
	}{
		{target: "/api/definitions?path=main.go&line=x&character=0", wantBody: `{"error":"line must be a number"}`},
		{target: "/api/file-content", wantBody: `{"error":"path is required"}`},
		{target: "/api/change-flow?target=main", wantBody: `{"error":"source must be a git ref"}`},
	}
	fetchSites := []struct {
		value   string
		allowed bool
	}{
		{value: "cross-site"},
		{value: "same-site"},
		{value: "same-origin", allowed: true},
		{value: "none", allowed: true},
		{value: "", allowed: true},
	}
	for _, route := range routes {
		for _, site := range fetchSites {
			t.Run(route.target+" "+site.value, func(t *testing.T) {
				headers := map[string]string{}
				if site.value != "" {
					headers["Sec-Fetch-Site"] = site.value
				}
				recorder := serveRequest(t, api, http.MethodGet, route.target, localHost, headers)
				body := strings.TrimSpace(recorder.Body.String())
				if !site.allowed {
					if recorder.Code != http.StatusForbidden || body != "cross-origin request" {
						t.Errorf("status = %d, body %q, want 403 cross-origin request", recorder.Code, body)
					}
					return
				}
				if recorder.Code != http.StatusBadRequest || body != route.wantBody {
					t.Errorf("status = %d, body %s, want the handler to answer 400 %s", recorder.Code, body, route.wantBody)
				}
			})
		}
	}
}

func TestFileContentEndpoint(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("symlinks need privileges on windows")
	}
	base := t.TempDir()
	repo := filepath.Join(base, "repo")
	external := filepath.Join(base, "external", "secret.txt")
	files := map[string]string{
		filepath.Join(repo, "pkg", "main.go"): "package main\n",
		filepath.Join(repo, "image.png"):      "\x89PNG\x00\x01",
		external:                              "TOP-SECRET-CONTENT",
	}
	for path, content := range files {
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	if err := os.Mkdir(filepath.Join(repo, "empty"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(repo, "big.bin"), nil, 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.Truncate(filepath.Join(repo, "big.bin"), langserver.ReadLimit+1); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(external, filepath.Join(repo, "escape.txt")); err != nil {
		t.Fatal(err)
	}
	api := newGuardedAPI(t, repo)
	tests := []struct {
		name       string
		query      url.Values
		wantStatus int
		wantBody   string
	}{
		{name: "a repo file", query: url.Values{"path": {"pkg/main.go"}}, wantStatus: http.StatusOK, wantBody: `{"path":"pkg/main.go","contents":"package main\n"}`},
		{name: "a missing file", query: url.Values{"path": {"pkg/missing.go"}}, wantStatus: http.StatusNotFound, wantBody: `{"error":"file pkg/missing.go: not found"}`},
		{name: "a directory", query: url.Values{"path": {"empty"}}, wantStatus: http.StatusNotFound, wantBody: `{"error":"file empty: not found"}`},
		{name: "a binary file", query: url.Values{"path": {"image.png"}}, wantStatus: http.StatusBadRequest, wantBody: `{"error":"path is a binary file"}`},
		{name: "a file over the read limit", query: url.Values{"path": {"big.bin"}}, wantStatus: http.StatusBadRequest, wantBody: `{"error":"path is larger than 8 MiB"}`},
		{name: "a path out of the repo", query: url.Values{"path": {"../external/secret.txt"}}, wantStatus: http.StatusBadRequest, wantBody: `{"error":"path must stay inside the repository"}`},
		{name: "an external file no lookup returned", query: url.Values{"external": {external}}, wantStatus: http.StatusNotFound, wantBody: `{"error":"external file ` + external + `: not found"}`},
		{name: "a relative external path", query: url.Values{"external": {"external/secret.txt"}}, wantStatus: http.StatusBadRequest, wantBody: `{"error":"external must be an absolute path"}`},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			recorder := serveRequest(t, api, http.MethodGet, "/api/file-content?"+test.query.Encode(), localHost, map[string]string{"Sec-Fetch-Site": "same-origin"})
			if recorder.Code != test.wantStatus {
				t.Errorf("status = %d, want %d", recorder.Code, test.wantStatus)
			}
			if body := strings.TrimSpace(recorder.Body.String()); body != test.wantBody {
				t.Errorf("body = %s, want %s", body, test.wantBody)
			}
		})
	}
	t.Run("a link out of the repo is not served", func(t *testing.T) {
		captureLogs(t)
		recorder := serveRequest(t, api, http.MethodGet, "/api/file-content?path=escape.txt", localHost, map[string]string{"Sec-Fetch-Site": "same-origin"})
		if recorder.Code == http.StatusOK || strings.Contains(recorder.Body.String(), "TOP-SECRET-CONTENT") {
			t.Errorf("status = %d, body %s, want the linked file refused", recorder.Code, recorder.Body.String())
		}
		if body := decodeBody[dto.Error](t, recorder); body.Error == "" {
			t.Errorf("body = %s, want a JSON error", recorder.Body.String())
		}
	})
	t.Run("a link out of the repo answers 404 like a missing file without an error log", func(t *testing.T) {
		logs := captureLogs(t)
		recorder := serveRequest(t, api, http.MethodGet, "/api/file-content?path=escape.txt", localHost, map[string]string{"Sec-Fetch-Site": "same-origin"})
		if recorder.Code != http.StatusNotFound {
			t.Errorf("status = %d, want %d", recorder.Code, http.StatusNotFound)
		}
		if logs.String() != "" {
			t.Errorf("logs = %q, want nothing", logs.String())
		}
	})
}
