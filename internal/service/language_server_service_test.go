package service

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"slices"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"testing/synctest"
	"time"

	"github.com/obsfx/oversee/internal/catalog"
	"github.com/obsfx/oversee/internal/domain"
)

const installPlatform = catalog.PlatformDarwinArm64

var installCatalog = catalog.Catalog{
	FileTypes: map[string]catalog.FileType{
		"go":   {Extensions: []string{"go"}, Server: "gopls"},
		"java": {Extensions: []string{"java"}, Server: "jdtls"},
		"zig":  {Extensions: []string{"zig"}, Server: "zls"},
	},
	Servers: []catalog.Server{
		{
			ID:       "gopls",
			Version:  "0.20.0",
			Install:  catalog.Install{Type: catalog.InstallGolang},
			Requires: []catalog.Requirement{catalog.RequiresGo},
		},
		{
			ID:       "jdtls",
			Version:  "1.50.0",
			Install:  catalog.Install{Type: catalog.InstallDownload, Platforms: map[catalog.Platform]catalog.Download{installPlatform: {}}},
			Requires: []catalog.Requirement{catalog.RequiresJava},
			Minimums: map[catalog.Requirement]string{catalog.RequiresJava: "21"},
		},
		{
			ID:      "zls",
			Version: "0.15.0",
			Install: catalog.Install{Type: catalog.InstallDownload, Platforms: map[catalog.Platform]catalog.Download{catalog.PlatformLinuxX64Gnu: {}}},
		},
	},
}

var errDownloadFailed = errors.New("download failed: 404")

type journal struct {
	mu      sync.Mutex
	entries []string
}

func (j *journal) note(format string, args ...any) {
	j.mu.Lock()
	defer j.mu.Unlock()
	j.entries = append(j.entries, fmt.Sprintf(format, args...))
}

func (j *journal) take() []string {
	j.mu.Lock()
	defer j.mu.Unlock()
	entries := j.entries
	j.entries = nil
	return entries
}

func (j *journal) Stop(prefix string) {
	j.note("stop %q", prefix)
}

func stopOf(id string) string {
	return fmt.Sprintf("stop %q", id+"\x00")
}

type installStore struct {
	journal    *journal
	mu         sync.Mutex
	versions   map[string]string
	versionErr error
	removeErr  error
	keepErr    error
	removing   chan struct{}
}

func (s *installStore) InstalledVersion(id string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.versions[id], s.versionErr
}

func (s *installStore) Remove(id string) error {
	s.journal.note("remove %s", id)
	s.mu.Lock()
	removing := s.removing
	s.mu.Unlock()
	if removing != nil {
		<-removing
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.removeErr != nil {
		return s.removeErr
	}
	delete(s.versions, id)
	return nil
}

func (s *installStore) KeepOnly(id, version string) error {
	s.journal.note("keep %s %s", id, version)
	return s.keepErr
}

func (s *installStore) set(id, version string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.versions[id] = version
}

type installStep struct {
	progress domain.InstallProgress
	err      error
	finish   bool
}

type fakeInstaller struct {
	journal *journal
	store   *installStore
	mu      sync.Mutex
	steps   map[string]chan installStep
	errs    map[string]error
	runs    map[string]int
}

func (f *fakeInstaller) Install(ctx context.Context, server catalog.Server, platform catalog.Platform, progress func(domain.InstallProgress)) error {
	f.journal.note("install %s %s", server.ID, platform)
	f.mu.Lock()
	f.runs[server.ID]++
	steps, err := f.steps[server.ID], f.errs[server.ID]
	f.mu.Unlock()
	if err != nil {
		return err
	}
	for steps != nil {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case step := <-steps:
			if step.finish && step.err != nil {
				return step.err
			}
			if step.finish {
				steps = nil
				continue
			}
			progress(step.progress)
		}
	}
	f.store.set(server.ID, server.Version)
	return nil
}

func (f *fakeInstaller) hold(id string) chan installStep {
	f.mu.Lock()
	defer f.mu.Unlock()
	steps := make(chan installStep)
	f.steps[id] = steps
	return steps
}

func (f *fakeInstaller) runsOf(id string) int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.runs[id]
}

type fakeToolchain struct {
	missing map[catalog.Requirement]domain.MissingTool
}

func (f fakeToolchain) Missing(requirements []catalog.Requirement, minimums map[catalog.Requirement]string) []domain.MissingTool {
	var found []domain.MissingTool
	for _, requirement := range requirements {
		tool, missing := f.missing[requirement]
		if !missing || tool.Minimum != minimums[requirement] {
			continue
		}
		found = append(found, tool)
	}
	return found
}

type installFixture struct {
	journal   *journal
	store     *installStore
	installer *fakeInstaller
	toolchain fakeToolchain
	service   *LanguageServerService
}

func newInstallFixture(t *testing.T) *installFixture {
	log := &journal{}
	store := &installStore{journal: log, versions: map[string]string{}}
	fixture := &installFixture{
		journal:   log,
		store:     store,
		installer: &fakeInstaller{journal: log, store: store, steps: map[string]chan installStep{}, errs: map[string]error{}, runs: map[string]int{}},
		toolchain: fakeToolchain{missing: map[catalog.Requirement]domain.MissingTool{}},
	}
	fixture.service = NewLanguageServerService(installCatalog, installPlatform, fixture.installer, store, fixture.toolchain, log)
	t.Cleanup(fixture.service.Close)
	return fixture
}

func (f *installFixture) state(t *testing.T, id string) domain.LanguageServerState {
	t.Helper()
	list, err := f.service.List(t.Context())
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
	for _, entry := range list.Servers {
		if entry.Server.ID == id {
			return entry.State
		}
	}
	t.Fatalf("List() has no %s", id)
	return domain.LanguageServerState{}
}

func (f *installFixture) install(t *testing.T, id string) bool {
	t.Helper()
	_, started, err := f.service.Install(t.Context(), id)
	if err != nil {
		t.Fatalf("Install(%s) error = %v", id, err)
	}
	return started
}

func goplsState(change func(state *domain.LanguageServerState)) domain.LanguageServerState {
	state := domain.LanguageServerState{ID: "gopls", CatalogVersion: "0.20.0", Available: true}
	change(&state)
	return state
}

func TestLanguageServerServiceListsEveryServerState(t *testing.T) {
	tests := []struct {
		name       string
		id         string
		setup      func(t *testing.T, f *installFixture)
		want       domain.LanguageServerState
		wantStatus domain.LanguageServerStatus
		wantUpdate bool
	}{
		{
			name:       "not installed",
			id:         "gopls",
			want:       goplsState(func(*domain.LanguageServerState) {}),
			wantStatus: domain.LanguageServerNotInstalled,
		},
		{
			name: "installed at the catalog version",
			id:   "gopls",
			setup: func(_ *testing.T, f *installFixture) {
				f.store.set("gopls", "0.20.0")
			},
			want: goplsState(func(state *domain.LanguageServerState) {
				state.InstalledVersion = "0.20.0"
			}),
			wantStatus: domain.LanguageServerInstalled,
		},
		{
			name: "installed at an older version",
			id:   "gopls",
			setup: func(_ *testing.T, f *installFixture) {
				f.store.set("gopls", "0.19.1")
			},
			want: goplsState(func(state *domain.LanguageServerState) {
				state.InstalledVersion = "0.19.1"
			}),
			wantStatus: domain.LanguageServerInstalled,
			wantUpdate: true,
		},
		{
			name: "installing with progress",
			id:   "gopls",
			setup: func(t *testing.T, f *installFixture) {
				steps := f.installer.hold("gopls")
				f.install(t, "gopls")
				steps <- installStep{progress: domain.InstallProgress{Received: 10, Total: 100}}
			},
			want: goplsState(func(state *domain.LanguageServerState) {
				state.Installing = true
				state.Progress = domain.InstallProgress{Received: 10, Total: 100}
			}),
			wantStatus: domain.LanguageServerInstalling,
		},
		{
			name: "a failed install",
			id:   "gopls",
			setup: func(t *testing.T, f *installFixture) {
				f.installer.errs["gopls"] = errDownloadFailed
				f.install(t, "gopls")
			},
			want: goplsState(func(state *domain.LanguageServerState) {
				state.Failure = errDownloadFailed.Error()
			}),
			wantStatus: domain.LanguageServerFailed,
		},
		{
			name: "a missing requirement",
			id:   "gopls",
			setup: func(_ *testing.T, f *installFixture) {
				f.toolchain.missing[catalog.RequiresGo] = domain.MissingTool{Tool: "go"}
			},
			want: goplsState(func(state *domain.LanguageServerState) {
				state.Missing = []domain.MissingTool{{Tool: "go"}}
			}),
			wantStatus: domain.LanguageServerNotInstalled,
		},
		{
			name: "an outdated requirement",
			id:   "jdtls",
			setup: func(_ *testing.T, f *installFixture) {
				f.toolchain.missing[catalog.RequiresJava] = domain.MissingTool{Tool: "java", Minimum: "21", Found: "17"}
			},
			want: domain.LanguageServerState{
				ID:             "jdtls",
				CatalogVersion: "1.50.0",
				Available:      true,
				Missing:        []domain.MissingTool{{Tool: "java", Minimum: "21", Found: "17"}},
			},
			wantStatus: domain.LanguageServerNotInstalled,
		},
		{
			name:       "no build for this platform",
			id:         "zls",
			want:       domain.LanguageServerState{ID: "zls", CatalogVersion: "0.15.0"},
			wantStatus: domain.LanguageServerNotInstalled,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			synctest.Test(t, func(t *testing.T) {
				fixture := newInstallFixture(t)
				if test.setup != nil {
					test.setup(t, fixture)
				}
				synctest.Wait()
				state := fixture.state(t, test.id)
				if !reflect.DeepEqual(state, test.want) {
					t.Fatalf("state =\n%+v\nwant\n%+v", state, test.want)
				}
				if state.Status() != test.wantStatus || state.UpdateAvailable() != test.wantUpdate {
					t.Fatalf("status %s update %t, want %s update %t", state.Status(), state.UpdateAvailable(), test.wantStatus, test.wantUpdate)
				}
			})
		})
	}
}

func TestLanguageServerServiceListDescribesTheCatalog(t *testing.T) {
	fixture := newInstallFixture(t)
	list, err := fixture.service.List(t.Context())
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
	ids := make([]string, 0, len(list.Servers))
	for _, entry := range list.Servers {
		ids = append(ids, entry.Server.ID)
	}
	if list.Platform != installPlatform || !reflect.DeepEqual(list.FileTypes, installCatalog.FileTypes) || !slices.Equal(ids, []string{"gopls", "jdtls", "zls"}) {
		t.Fatalf("List() = %s %+v %q, want the platform, file types and servers of the catalog", list.Platform, list.FileTypes, ids)
	}
	errStore := errors.New("read lsp home")
	fixture.store.versionErr = errStore
	if _, err := fixture.service.List(t.Context()); !errors.Is(err, errStore) {
		t.Fatalf("List() error = %v, want the store error", err)
	}
}

func TestLanguageServerServiceInstallDecides(t *testing.T) {
	errStore := errors.New("read lsp home")
	tests := []struct {
		name        string
		id          string
		setup       func(f *installFixture)
		wantStarted bool
		wantStatus  domain.LanguageServerStatus
		wantErr     func(error) bool
		wantRuns    int
	}{
		{
			name: "a server the catalog does not list",
			id:   "pyright",
			wantErr: func(err error) bool {
				return errors.Is(err, domain.ErrNotFound)
			},
		},
		{
			name: "a server already at the catalog version",
			id:   "gopls",
			setup: func(f *installFixture) {
				f.store.set("gopls", "0.20.0")
			},
			wantStatus: domain.LanguageServerInstalled,
		},
		{
			name: "a server with an update",
			id:   "gopls",
			setup: func(f *installFixture) {
				f.store.set("gopls", "0.19.1")
			},
			wantStarted: true,
			wantStatus:  domain.LanguageServerInstalling,
			wantRuns:    1,
		},
		{
			name:        "a server that is not installed",
			id:          "gopls",
			wantStarted: true,
			wantStatus:  domain.LanguageServerInstalling,
			wantRuns:    1,
		},
		{
			name: "a server without a build for this platform",
			id:   "zls",
			wantErr: func(err error) bool {
				return errors.Is(err, domain.ErrLanguageServerUnavailable)
			},
		},
		{
			name: "a server missing a requirement",
			id:   "gopls",
			setup: func(f *installFixture) {
				f.toolchain.missing[catalog.RequiresGo] = domain.MissingTool{Tool: "go"}
			},
			wantErr: func(err error) bool {
				return errors.Is(err, domain.ErrLanguageServerUnavailable) && strings.Contains(err.Error(), "needs go")
			},
		},
		{
			name: "a server with an outdated requirement",
			id:   "jdtls",
			setup: func(f *installFixture) {
				f.toolchain.missing[catalog.RequiresJava] = domain.MissingTool{Tool: "java", Minimum: "21", Found: "17"}
			},
			wantErr: func(err error) bool {
				return errors.Is(err, domain.ErrLanguageServerUnavailable) && strings.Contains(err.Error(), "java 21 or newer")
			},
		},
		{
			name: "an installed version that can not be read",
			id:   "gopls",
			setup: func(f *installFixture) {
				f.store.versionErr = errStore
			},
			wantErr: func(err error) bool {
				return errors.Is(err, errStore)
			},
		},
		{
			name: "a closed service",
			id:   "gopls",
			setup: func(f *installFixture) {
				f.service.Close()
			},
			wantErr: func(err error) bool {
				return errors.Is(err, domain.ErrLanguageServerBusy)
			},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			synctest.Test(t, func(t *testing.T) {
				fixture := newInstallFixture(t)
				fixture.installer.hold(test.id)
				if test.setup != nil {
					test.setup(fixture)
				}
				entry, started, err := fixture.service.Install(t.Context(), test.id)
				synctest.Wait()
				if test.wantErr != nil {
					if !test.wantErr(err) {
						t.Fatalf("Install() error = %v, not the expected error", err)
					}
				} else if err != nil {
					t.Fatalf("Install() error = %v", err)
				}
				if started != test.wantStarted {
					t.Fatalf("Install() started = %t, want %t", started, test.wantStarted)
				}
				if test.wantErr == nil && entry.State.Status() != test.wantStatus {
					t.Fatalf("Install() status = %s, want %s", entry.State.Status(), test.wantStatus)
				}
				if runs := fixture.installer.runsOf(test.id); runs != test.wantRuns {
					t.Fatalf("installer ran %d times, want %d", runs, test.wantRuns)
				}
			})
		})
	}
}

func TestLanguageServerServiceRunsOneInstallPerServer(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		fixture := newInstallFixture(t)
		gopls := fixture.installer.hold("gopls")
		jdtls := fixture.installer.hold("jdtls")
		if !fixture.install(t, "gopls") {
			t.Fatalf("the first Install(gopls) did not start a job")
		}
		entry, started, err := fixture.service.Install(t.Context(), "gopls")
		if err != nil || started || !entry.State.Installing {
			t.Fatalf("the second Install(gopls) = %+v, %t, %v, want the running job", entry.State, started, err)
		}
		if !fixture.install(t, "jdtls") {
			t.Fatalf("Install(jdtls) waited for another server's job")
		}
		synctest.Wait()
		if gr, jr := fixture.installer.runsOf("gopls"), fixture.installer.runsOf("jdtls"); gr != 1 || jr != 1 {
			t.Fatalf("installer runs gopls %d jdtls %d, want 1 each", gr, jr)
		}
		gopls <- installStep{finish: true}
		jdtls <- installStep{finish: true}
		synctest.Wait()
		for _, id := range []string{"gopls", "jdtls"} {
			if state := fixture.state(t, id); state.Status() != domain.LanguageServerInstalled {
				t.Fatalf("%s status = %s, want installed", id, state.Status())
			}
		}
	})
}

func TestLanguageServerServiceInstallReplacesRunningSessions(t *testing.T) {
	tests := []struct {
		name    string
		keepErr error
	}{
		{name: "a cleanup that succeeds"},
		{name: "a cleanup that fails", keepErr: errors.New("remove 0.19.1: busy")},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			synctest.Test(t, func(t *testing.T) {
				fixture := newInstallFixture(t)
				fixture.store.set("gopls", "0.19.1")
				fixture.store.keepErr = test.keepErr
				fixture.install(t, "gopls")
				synctest.Wait()
				want := []string{"install gopls darwin-arm64", stopOf("gopls"), "keep gopls 0.20.0", stopOf("gopls")}
				if got := fixture.journal.take(); !slices.Equal(got, want) {
					t.Fatalf("effects = %q, want %q", got, want)
				}
				state := fixture.state(t, "gopls")
				if state.Status() != domain.LanguageServerInstalled || state.UpdateAvailable() || state.Failure != "" {
					t.Fatalf("state = %+v, want installed at the catalog version without a failure", state)
				}
			})
		})
	}
}

func TestLanguageServerServiceRecordsFailedInstalls(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		fixture := newInstallFixture(t)
		fixture.installer.errs["gopls"] = errDownloadFailed
		fixture.install(t, "gopls")
		synctest.Wait()
		if got, want := fixture.journal.take(), []string{"install gopls darwin-arm64"}; !slices.Equal(got, want) {
			t.Fatalf("effects = %q, want only the install %q", got, want)
		}
		if state := fixture.state(t, "gopls"); state.Failure != errDownloadFailed.Error() {
			t.Fatalf("failure = %q, want %q", state.Failure, errDownloadFailed)
		}
		fixture.installer.mu.Lock()
		delete(fixture.installer.errs, "gopls")
		fixture.installer.mu.Unlock()
		steps := fixture.installer.hold("gopls")
		fixture.install(t, "gopls")
		if state := fixture.state(t, "gopls"); state.Failure != "" || !state.Installing {
			t.Fatalf("state after a retry = %+v, want installing without the old failure", state)
		}
		steps <- installStep{finish: true, err: errors.New("checksum mismatch")}
		synctest.Wait()
		if state := fixture.state(t, "gopls"); state.Failure != "checksum mismatch" {
			t.Fatalf("failure = %q, want the latest one", state.Failure)
		}
	})
}

func TestLanguageServerServiceFailsAnInstallThatStopsProgressing(t *testing.T) {
	tests := []struct {
		name       string
		progressAt []time.Duration
		aliveAt    time.Duration
	}{
		{name: "an install that never reports", aliveAt: 3*time.Minute - time.Millisecond},
		{name: "an install that reported after 2 minutes", progressAt: []time.Duration{2 * time.Minute}, aliveAt: 5*time.Minute - time.Millisecond},
		{name: "an install that keeps reporting", progressAt: []time.Duration{2 * time.Minute, 4 * time.Minute, 6 * time.Minute}, aliveAt: 9*time.Minute - time.Millisecond},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			synctest.Test(t, func(t *testing.T) {
				fixture := newInstallFixture(t)
				steps := fixture.installer.hold("gopls")
				began := time.Now()
				fixture.install(t, "gopls")
				for index, at := range test.progressAt {
					time.Sleep(at - time.Since(began))
					steps <- installStep{progress: domain.InstallProgress{Received: int64(index + 1)}}
				}
				time.Sleep(test.aliveAt - time.Since(began))
				synctest.Wait()
				if state := fixture.state(t, "gopls"); !state.Installing {
					t.Fatalf("state at %s = %+v, want still installing", test.aliveAt, state)
				}
				time.Sleep(time.Millisecond)
				synctest.Wait()
				state := fixture.state(t, "gopls")
				if state.Installing || state.Failure != "install made no progress for 3 minutes" {
					t.Fatalf("state after 3 idle minutes = %+v, want the stalled failure", state)
				}
			})
		})
	}
}

func TestLanguageServerServiceCancelRecordsNoFailure(t *testing.T) {
	tests := []struct {
		name          string
		installed     string
		wantInstalled string
	}{
		{name: "a first install", wantInstalled: ""},
		{name: "an update", installed: "0.19.1", wantInstalled: "0.19.1"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			synctest.Test(t, func(t *testing.T) {
				fixture := newInstallFixture(t)
				if test.installed != "" {
					fixture.store.set("gopls", test.installed)
				}
				fixture.installer.hold("gopls")
				fixture.install(t, "gopls")
				if err := fixture.service.Cancel("gopls"); err != nil {
					t.Fatalf("Cancel() error = %v", err)
				}
				synctest.Wait()
				want := goplsState(func(state *domain.LanguageServerState) {
					state.InstalledVersion = test.wantInstalled
				})
				if state := fixture.state(t, "gopls"); !reflect.DeepEqual(state, want) {
					t.Fatalf("state after Cancel = %+v, want %+v", state, want)
				}
				if got, want := fixture.journal.take(), []string{"install gopls darwin-arm64"}; !slices.Equal(got, want) {
					t.Fatalf("effects = %q, want only the install %q", got, want)
				}
			})
		})
	}
}

func TestLanguageServerServiceCancelWithoutARunningInstall(t *testing.T) {
	fixture := newInstallFixture(t)
	if err := fixture.service.Cancel("gopls"); err != nil {
		t.Fatalf("Cancel() with nothing running error = %v", err)
	}
	if err := fixture.service.Cancel("pyright"); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("Cancel(unknown) error = %v, want ErrNotFound", err)
	}
	if got := fixture.journal.take(); len(got) != 0 {
		t.Fatalf("effects = %q, want none", got)
	}
}

func TestLanguageServerServiceCloseCancelsInstallsWithoutFailures(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		fixture := newInstallFixture(t)
		fixture.installer.hold("gopls")
		fixture.install(t, "gopls")
		fixture.service.Close()
		state := fixture.state(t, "gopls")
		if state.Installing || state.Failure != "" {
			t.Fatalf("state after Close = %+v, want neither installing nor failed", state)
		}
	})
}

func TestLanguageServerServiceUninstall(t *testing.T) {
	errRemove := errors.New("remove gopls: permission denied")
	tests := []struct {
		name        string
		id          string
		setup       func(t *testing.T, f *installFixture)
		removeErr   error
		wantErr     func(error) bool
		wantEffects []string
		want        domain.LanguageServerState
	}{
		{
			name: "an installed server",
			id:   "gopls",
			setup: func(_ *testing.T, f *installFixture) {
				f.store.set("gopls", "0.20.0")
			},
			wantEffects: []string{stopOf("gopls"), "remove gopls", stopOf("gopls")},
			want:        goplsState(func(*domain.LanguageServerState) {}),
		},
		{
			name: "a server whose last install failed",
			id:   "gopls",
			setup: func(t *testing.T, f *installFixture) {
				f.installer.errs["gopls"] = errDownloadFailed
				f.install(t, "gopls")
				synctest.Wait()
				f.journal.take()
			},
			wantEffects: []string{stopOf("gopls"), "remove gopls", stopOf("gopls")},
			want:        goplsState(func(*domain.LanguageServerState) {}),
		},
		{
			name: "a removal that fails",
			id:   "gopls",
			setup: func(_ *testing.T, f *installFixture) {
				f.store.set("gopls", "0.20.0")
				f.store.removeErr = errRemove
			},
			wantErr: func(err error) bool {
				return errors.Is(err, errRemove)
			},
			wantEffects: []string{stopOf("gopls"), "remove gopls", stopOf("gopls")},
			want: goplsState(func(state *domain.LanguageServerState) {
				state.InstalledVersion = "0.20.0"
			}),
		},
		{
			name: "a server that is installing",
			id:   "gopls",
			setup: func(t *testing.T, f *installFixture) {
				f.installer.hold("gopls")
				f.install(t, "gopls")
				synctest.Wait()
				f.journal.take()
			},
			wantErr: func(err error) bool {
				return errors.Is(err, domain.ErrLanguageServerBusy)
			},
			want: goplsState(func(state *domain.LanguageServerState) {
				state.Installing = true
			}),
		},
		{
			name: "a server the catalog does not list",
			id:   "pyright",
			wantErr: func(err error) bool {
				return errors.Is(err, domain.ErrNotFound)
			},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			synctest.Test(t, func(t *testing.T) {
				fixture := newInstallFixture(t)
				if test.setup != nil {
					test.setup(t, fixture)
				}
				err := fixture.service.Uninstall(t.Context(), test.id)
				if test.wantErr != nil {
					if !test.wantErr(err) {
						t.Fatalf("Uninstall() error = %v, not the expected error", err)
					}
				} else if err != nil {
					t.Fatalf("Uninstall() error = %v", err)
				}
				if got := fixture.journal.take(); !slices.Equal(got, test.wantEffects) {
					t.Fatalf("effects = %q, want %q", got, test.wantEffects)
				}
				if test.id != "gopls" {
					return
				}
				if state := fixture.state(t, "gopls"); !reflect.DeepEqual(state, test.want) {
					t.Fatalf("state after Uninstall = %+v, want %+v", state, test.want)
				}
			})
		})
	}
}

func TestLanguageServerServiceUninstallClaimsTheServer(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		fixture := newInstallFixture(t)
		fixture.store.set("gopls", "0.20.0")
		fixture.store.removing = make(chan struct{})
		removed := make(chan error, 1)
		go func() {
			removed <- fixture.service.Uninstall(t.Context(), "gopls")
		}()
		synctest.Wait()
		fixture.store.set("gopls", "0.19.1")
		if _, _, err := fixture.service.Install(t.Context(), "gopls"); !errors.Is(err, domain.ErrLanguageServerBusy) {
			t.Fatalf("Install() during a removal error = %v, want ErrLanguageServerBusy", err)
		}
		if err := fixture.service.Uninstall(t.Context(), "gopls"); !errors.Is(err, domain.ErrLanguageServerBusy) {
			t.Fatalf("a second Uninstall() error = %v, want ErrLanguageServerBusy", err)
		}
		if err := fixture.service.Cancel("gopls"); err != nil {
			t.Fatalf("Cancel() during a removal error = %v", err)
		}
		close(fixture.store.removing)
		if err := awaitValue(t, removed); err != nil {
			t.Fatalf("Uninstall() error = %v", err)
		}
		if got, want := fixture.journal.take(), []string{stopOf("gopls"), "remove gopls", stopOf("gopls")}; !slices.Equal(got, want) {
			t.Fatalf("effects = %q, want one removal %q", got, want)
		}
		if runs := fixture.installer.runsOf("gopls"); runs != 0 {
			t.Fatalf("installer ran %d times during the removal", runs)
		}
		if !fixture.install(t, "gopls") {
			t.Fatalf("Install() after the removal did not start")
		}
	})
}

func awaitValue[T any](t *testing.T, values <-chan T) T {
	t.Helper()
	select {
	case value := <-values:
		return value
	case <-time.After(5 * time.Second):
		t.Fatalf("nothing arrived within 5s")
		var zero T
		return zero
	}
}

func TestLanguageServerServiceSignalsChanges(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		fixture := newInstallFixture(t)
		var signals atomic.Int32
		ctx, cancel := context.WithCancel(t.Context())
		defer cancel()
		go fixture.service.Follow(ctx, func() {
			signals.Add(1)
		})
		steps := fixture.installer.hold("gopls")
		report := func(received int64) {
			steps <- installStep{progress: domain.InstallProgress{Received: received, Total: 100}}
		}
		expect := func(label string, want int32, wantProgress int64) {
			t.Helper()
			synctest.Wait()
			if got := signals.Load(); got != want {
				t.Fatalf("%s: %d signals, want %d", label, got, want)
			}
			if wantProgress > 0 {
				if progress := fixture.state(t, "gopls").Progress; progress.Received != wantProgress {
					t.Fatalf("%s: progress %+v, want %d received", label, progress, wantProgress)
				}
			}
		}
		expect("before anything", 0, 0)
		fixture.install(t, "gopls")
		expect("a job that starts", 1, 0)
		report(10)
		expect("the first progress", 2, 10)
		report(20)
		expect("progress within 250ms", 2, 20)
		time.Sleep(249 * time.Millisecond)
		report(30)
		expect("progress 249ms after the last signal", 2, 30)
		time.Sleep(time.Millisecond)
		expect("the trailing signal 250ms after the last one", 3, 30)
		report(30)
		expect("unchanged progress", 3, 30)
		time.Sleep(250 * time.Millisecond)
		report(40)
		expect("changed progress 250ms after the last signal", 4, 40)
		report(50)
		expect("progress within 250ms of the last signal", 4, 50)
		steps <- installStep{finish: true}
		expect("a job that ends, replacing the pending trailing signal", 5, 0)
		time.Sleep(250 * time.Millisecond)
		expect("250ms after the job ended", 5, 0)
		if _, started, err := fixture.service.Install(t.Context(), "gopls"); err != nil || started {
			t.Fatalf("Install() of an installed server = %t, %v", started, err)
		}
		expect("an install with nothing to do", 5, 0)
		if err := fixture.service.Cancel("gopls"); err != nil {
			t.Fatalf("Cancel() error = %v", err)
		}
		expect("a cancel with nothing running", 5, 0)
		if err := fixture.service.Uninstall(t.Context(), "gopls"); err != nil {
			t.Fatalf("Uninstall() error = %v", err)
		}
		expect("a removal", 6, 0)
		if _, _, err := fixture.service.Install(t.Context(), "zls"); !errors.Is(err, domain.ErrLanguageServerUnavailable) {
			t.Fatalf("Install(zls) error = %v, want ErrLanguageServerUnavailable", err)
		}
		expect("an install that can not start", 6, 0)
	})
}
