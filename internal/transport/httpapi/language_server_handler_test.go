package httpapi

import (
	"context"
	"encoding/json/v2"
	"errors"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/obsfx/oversee/internal/catalog"
	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/service"
	"github.com/obsfx/oversee/internal/transport/dto"
)

const servicePlatform = catalog.PlatformLinuxX64Gnu

type installerStub struct {
	mu       sync.Mutex
	calls    []string
	started  chan string
	canceled chan string
	release  chan struct{}
}

func newInstallerStub() *installerStub {
	return &installerStub{started: make(chan string, 8), canceled: make(chan string, 8), release: make(chan struct{})}
}

func (i *installerStub) Install(ctx context.Context, server catalog.Server, _ catalog.Platform, progress func(domain.InstallProgress)) error {
	i.mu.Lock()
	i.calls = append(i.calls, server.ID)
	i.mu.Unlock()
	progress(domain.InstallProgress{Received: 10, Total: 100})
	i.started <- server.ID
	select {
	case <-i.release:
		return nil
	case <-ctx.Done():
		i.canceled <- server.ID
		return ctx.Err()
	}
}

func (i *installerStub) installed() []string {
	i.mu.Lock()
	defer i.mu.Unlock()
	return slices.Clone(i.calls)
}

func (i *installerStub) waitStarted(t *testing.T, id string) {
	t.Helper()
	select {
	case started := <-i.started:
		if started != id {
			t.Fatalf("install started for %s, want %s", started, id)
		}
	case <-time.After(5 * time.Second):
		t.Fatalf("the install of %s did not start", id)
	}
}

type installationStoreStub struct {
	mu        sync.Mutex
	versions  map[string]string
	removed   []string
	removeErr error
}

func (s *installationStoreStub) InstalledVersion(id string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.versions[id], nil
}

func (s *installationStoreStub) Remove(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.removed = append(s.removed, id)
	return s.removeErr
}

func (s *installationStoreStub) KeepOnly(string, string) error {
	return nil
}

func (s *installationStoreStub) removedIDs() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return slices.Clone(s.removed)
}

type requirementProbeStub map[catalog.Requirement]bool

func (p requirementProbeStub) Missing(requirements []catalog.Requirement, _ map[catalog.Requirement]string) []domain.MissingTool {
	var missing []domain.MissingTool
	for _, requirement := range requirements {
		if p[requirement] {
			missing = append(missing, domain.MissingTool{Tool: string(requirement)})
		}
	}
	return missing
}

type sessionStopperStub struct {
	mu       sync.Mutex
	prefixes []string
}

func (s *sessionStopperStub) Stop(prefix string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.prefixes = append(s.prefixes, prefix)
}

func (s *sessionStopperStub) stopped() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return slices.Clone(s.prefixes)
}

func languageServerCatalog() catalog.Catalog {
	download := catalog.Download{
		Files: []catalog.File{{URL: "https://example.com/server.tar.gz", SHA256: strings.Repeat("0", 64), Name: "server.tar.gz"}},
		Bins:  map[string]catalog.Bin{"server": {Kind: catalog.BinExec, Path: "server"}},
	}
	return catalog.Catalog{
		SchemaVersion: catalog.SchemaVersion,
		FileTypes: map[string]catalog.FileType{
			"go":   {Extensions: []string{"go"}, Server: "gopls"},
			"zig":  {Extensions: []string{"zig"}, Server: "zls"},
			"java": {Extensions: []string{"java"}, Server: "jdtls"},
		},
		Servers: []catalog.Server{
			{
				ID:        "gopls",
				Version:   "0.20.0",
				FileTypes: []string{"go"},
				Run:       catalog.Run{Bin: "gopls"},
				Install:   catalog.Install{Type: catalog.InstallGolang, Package: "golang.org/x/tools/gopls", Version: "v0.20.0", Bins: map[string]catalog.Bin{"gopls": {Kind: catalog.BinGolang, Path: "gopls"}}},
				Requires:  []catalog.Requirement{catalog.RequiresGo},
			},
			{
				ID:        "zls",
				Version:   "0.14.0",
				FileTypes: []string{"zig"},
				Run:       catalog.Run{Bin: "server"},
				Install:   catalog.Install{Type: catalog.InstallDownload, Package: "zls", Version: "0.14.0", Platforms: map[catalog.Platform]catalog.Download{catalog.PlatformDarwinArm64: download}},
			},
			{
				ID:        "jdtls",
				Version:   "1.40.0",
				FileTypes: []string{"java"},
				Run:       catalog.Run{Bin: "server"},
				Install:   catalog.Install{Type: catalog.InstallDownload, Package: "jdtls", Version: "1.40.0", Platforms: map[catalog.Platform]catalog.Download{servicePlatform: download}},
				Requires:  []catalog.Requirement{catalog.RequiresJava},
				Minimums:  map[catalog.Requirement]string{catalog.RequiresJava: "21"},
			},
		},
	}
}

type languageServerAPI struct {
	handler   http.Handler
	installer *installerStub
	store     *installationStoreStub
	sessions  *sessionStopperStub
}

func newLanguageServerAPI(t *testing.T, installed map[string]string) languageServerAPI {
	t.Helper()
	api := languageServerAPI{
		installer: newInstallerStub(),
		store:     &installationStoreStub{versions: installed},
		sessions:  &sessionStopperStub{},
	}
	servers := service.NewLanguageServerService(languageServerCatalog(), servicePlatform, api.installer, api.store, requirementProbeStub{catalog.RequiresJava: true}, api.sessions)
	t.Cleanup(servers.Close)
	api.handler = New(Config{Services: service.Services{LanguageServers: servers}}).handler()
	return api
}

func (a languageServerAPI) serve(t *testing.T, method, target string) *httptest.ResponseRecorder {
	t.Helper()
	request := httptest.NewRequestWithContext(t.Context(), method, target, nil)
	request.Host = localHost
	recorder := httptest.NewRecorder()
	a.handler.ServeHTTP(recorder, request)
	return recorder
}

func decodeBody[T any](t *testing.T, recorder *httptest.ResponseRecorder) T {
	t.Helper()
	var body T
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode %s: %v", recorder.Body.String(), err)
	}
	return body
}

func (a languageServerAPI) status(t *testing.T, id string) dto.LanguageServer {
	t.Helper()
	recorder := a.serve(t, http.MethodGet, "/api/language-servers")
	if recorder.Code != http.StatusOK {
		t.Fatalf("list status = %d", recorder.Code)
	}
	list := decodeBody[dto.LanguageServerList](t, recorder)
	index := slices.IndexFunc(list.Servers, func(server dto.LanguageServer) bool {
		return server.ID == id
	})
	if index < 0 {
		t.Fatalf("%s is not listed", id)
	}
	return list.Servers[index]
}

func (a languageServerAPI) waitStatus(t *testing.T, id, status string) dto.LanguageServer {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for {
		server := a.status(t, id)
		if server.Status == status {
			return server
		}
		if time.Now().After(deadline) {
			t.Fatalf("%s status = %s, want %s", id, server.Status, status)
		}
		time.Sleep(10 * time.Millisecond)
	}
}

func requireStatus(t *testing.T, recorder *httptest.ResponseRecorder, want int) {
	t.Helper()
	if recorder.Code != want {
		t.Fatalf("status = %d, want %d (body %s)", recorder.Code, want, strings.TrimSpace(recorder.Body.String()))
	}
}

func requireErrorBody(t *testing.T, recorder *httptest.ResponseRecorder, want string) {
	t.Helper()
	if got := decodeBody[dto.Error](t, recorder).Error; got != want {
		t.Errorf("error = %q, want %q", got, want)
	}
}

func TestLanguageServerList(t *testing.T) {
	api := newLanguageServerAPI(t, map[string]string{"gopls": "0.19.0"})
	recorder := api.serve(t, http.MethodGet, "/api/language-servers")
	requireStatus(t, recorder, http.StatusOK)
	if contentType := recorder.Header().Get("Content-Type"); contentType != "application/json" {
		t.Errorf("Content-Type = %q", contentType)
	}
	list := decodeBody[dto.LanguageServerList](t, recorder)
	if list.Platform != string(servicePlatform) {
		t.Errorf("platform = %q", list.Platform)
	}
	if fileType := list.FileTypes["go"]; fileType.Server != "gopls" || !slices.Equal(fileType.Extensions, []string{"go"}) {
		t.Errorf("fileTypes[go] = %+v", fileType)
	}
	ids := make([]string, 0, len(list.Servers))
	for _, server := range list.Servers {
		ids = append(ids, server.ID)
	}
	if !slices.Equal(ids, []string{"gopls", "zls", "jdtls"}) {
		t.Fatalf("servers = %v, want the catalog order", ids)
	}
	gopls, zls, jdtls := list.Servers[0], list.Servers[1], list.Servers[2]
	if gopls.Status != "installed" || gopls.InstalledVersion != "0.19.0" || !gopls.UpdateAvailable || !gopls.Available || len(gopls.Missing) != 0 {
		t.Errorf("gopls = %+v, want installed with an update", gopls)
	}
	if zls.Status != "not-installed" || zls.Available {
		t.Errorf("zls = %+v, want not installed and unavailable", zls)
	}
	if jdtls.Status != "not-installed" || !jdtls.Available || !slices.Equal(jdtls.Missing, []string{"java"}) || !slices.Equal(jdtls.Requires, []string{"java"}) {
		t.Errorf("jdtls = %+v, want java missing", jdtls)
	}
}

func TestLanguageServerInstall(t *testing.T) {
	tests := []struct {
		name          string
		installed     map[string]string
		id            string
		wantStatus    int
		wantServer    string
		wantError     string
		wantInstalled []string
	}{
		{name: "starts an install", id: "gopls", wantStatus: http.StatusAccepted, wantServer: "installing", wantInstalled: []string{"gopls"}},
		{name: "an update starts an install", installed: map[string]string{"gopls": "0.19.0"}, id: "gopls", wantStatus: http.StatusAccepted, wantServer: "installing", wantInstalled: []string{"gopls"}},
		{name: "already at the catalog version", installed: map[string]string{"gopls": "0.20.0"}, id: "gopls", wantStatus: http.StatusOK, wantServer: "installed"},
		{name: "no build for this platform", id: "zls", wantStatus: http.StatusConflict, wantError: "language server can not be installed here: zls has no build for this platform"},
		{name: "a missing requirement", id: "jdtls", wantStatus: http.StatusConflict, wantError: "language server can not be installed here: jdtls needs java"},
		{name: "an unknown server", id: "nope", wantStatus: http.StatusNotFound, wantError: "language server nope: not found"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			api := newLanguageServerAPI(t, test.installed)
			recorder := api.serve(t, http.MethodPost, "/api/language-servers/"+test.id+"/install")
			requireStatus(t, recorder, test.wantStatus)
			if test.wantError != "" {
				requireErrorBody(t, recorder, test.wantError)
			} else if server := decodeBody[dto.LanguageServer](t, recorder); server.ID != test.id || server.Status != test.wantServer {
				t.Errorf("body = %+v, want %s %s", server, test.id, test.wantServer)
			}
			for _, id := range test.wantInstalled {
				api.installer.waitStarted(t, id)
			}
			if got := api.installer.installed(); !slices.Equal(got, test.wantInstalled) {
				t.Errorf("installer ran for %v, want %v", got, test.wantInstalled)
			}
		})
	}
}

func TestLanguageServerInstallWhileInstalling(t *testing.T) {
	api := newLanguageServerAPI(t, nil)
	requireStatus(t, api.serve(t, http.MethodPost, "/api/language-servers/gopls/install"), http.StatusAccepted)
	api.installer.waitStarted(t, "gopls")
	recorder := api.serve(t, http.MethodPost, "/api/language-servers/gopls/install")
	requireStatus(t, recorder, http.StatusOK)
	server := decodeBody[dto.LanguageServer](t, recorder)
	if server.Status != "installing" || server.Progress == nil || *server.Progress != (dto.LanguageServerProgress{Received: 10, Total: 100}) {
		t.Errorf("body = %+v (progress %v), want installing with progress 10 of 100", server, server.Progress)
	}
	if got := api.installer.installed(); !slices.Equal(got, []string{"gopls"}) {
		t.Errorf("installer ran for %v, want one install", got)
	}
	close(api.installer.release)
	if done := api.waitStatus(t, "gopls", "not-installed"); done.Error != "" {
		t.Errorf("error = %q after a finished install", done.Error)
	}
}

func TestLanguageServerCancel(t *testing.T) {
	t.Run("cancels a running install without a failure", func(t *testing.T) {
		api := newLanguageServerAPI(t, nil)
		requireStatus(t, api.serve(t, http.MethodPost, "/api/language-servers/gopls/install"), http.StatusAccepted)
		api.installer.waitStarted(t, "gopls")
		recorder := api.serve(t, http.MethodDelete, "/api/language-servers/gopls/install")
		requireStatus(t, recorder, http.StatusNoContent)
		if recorder.Body.Len() != 0 {
			t.Errorf("body = %q, want none", recorder.Body.String())
		}
		select {
		case id := <-api.installer.canceled:
			if id != "gopls" {
				t.Errorf("canceled %s, want gopls", id)
			}
		case <-time.After(5 * time.Second):
			t.Fatal("the install was not canceled")
		}
		if server := api.waitStatus(t, "gopls", "not-installed"); server.Error != "" {
			t.Errorf("error = %q, want a canceled install to record no failure", server.Error)
		}
	})
	t.Run("nothing to cancel", func(t *testing.T) {
		api := newLanguageServerAPI(t, nil)
		requireStatus(t, api.serve(t, http.MethodDelete, "/api/language-servers/gopls/install"), http.StatusNoContent)
	})
	t.Run("an unknown server", func(t *testing.T) {
		api := newLanguageServerAPI(t, nil)
		recorder := api.serve(t, http.MethodDelete, "/api/language-servers/nope/install")
		requireStatus(t, recorder, http.StatusNotFound)
		requireErrorBody(t, recorder, "language server nope: not found")
	})
}

func TestLanguageServerRemove(t *testing.T) {
	t.Run("removes an installed server and stops its sessions", func(t *testing.T) {
		api := newLanguageServerAPI(t, map[string]string{"gopls": "0.20.0"})
		recorder := api.serve(t, http.MethodDelete, "/api/language-servers/gopls")
		requireStatus(t, recorder, http.StatusNoContent)
		if got := api.store.removedIDs(); !slices.Equal(got, []string{"gopls"}) {
			t.Errorf("removed %v, want [gopls]", got)
		}
		stopped := api.sessions.stopped()
		if len(stopped) == 0 {
			t.Fatal("no sessions were stopped")
		}
		for _, prefix := range stopped {
			if !strings.HasPrefix(prefix, "gopls") {
				t.Errorf("stopped sessions %q, want only gopls sessions", prefix)
			}
		}
	})
	t.Run("busy while installing", func(t *testing.T) {
		api := newLanguageServerAPI(t, nil)
		requireStatus(t, api.serve(t, http.MethodPost, "/api/language-servers/gopls/install"), http.StatusAccepted)
		api.installer.waitStarted(t, "gopls")
		recorder := api.serve(t, http.MethodDelete, "/api/language-servers/gopls")
		requireStatus(t, recorder, http.StatusConflict)
		requireErrorBody(t, recorder, "language server is busy: gopls")
		if got := api.store.removedIDs(); len(got) != 0 {
			t.Errorf("removed %v while installing", got)
		}
	})
	t.Run("an unknown server", func(t *testing.T) {
		api := newLanguageServerAPI(t, nil)
		recorder := api.serve(t, http.MethodDelete, "/api/language-servers/nope")
		requireStatus(t, recorder, http.StatusNotFound)
		requireErrorBody(t, recorder, "language server nope: not found")
	})
	t.Run("a failed removal is a server error", func(t *testing.T) {
		logs := captureLogs(t)
		api := newLanguageServerAPI(t, map[string]string{"gopls": "0.20.0"})
		api.store.removeErr = errors.New("remove /home/.oversee/lsp/gopls: permission denied")
		recorder := api.serve(t, http.MethodDelete, "/api/language-servers/gopls")
		requireStatus(t, recorder, http.StatusInternalServerError)
		requireErrorBody(t, recorder, "remove /home/.oversee/lsp/gopls: permission denied")
		if !strings.Contains(logs.String(), "permission denied") {
			t.Errorf("logs = %q, want the failure logged", logs.String())
		}
	})
}
