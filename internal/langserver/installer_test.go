package langserver

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/obsfx/oversee/internal/catalog"
	"github.com/obsfx/oversee/internal/domain"
)

const testPlatform = catalog.PlatformLinuxX64Gnu

type progressLog struct {
	mu      sync.Mutex
	reports []domain.InstallProgress
	onWrite func(domain.InstallProgress)
}

func (l *progressLog) report(progress domain.InstallProgress) {
	l.mu.Lock()
	l.reports = append(l.reports, progress)
	onWrite := l.onWrite
	l.mu.Unlock()
	if onWrite != nil {
		onWrite(progress)
	}
}

func (l *progressLog) all() []domain.InstallProgress {
	l.mu.Lock()
	defer l.mu.Unlock()
	return slices.Clone(l.reports)
}

type downloadHost struct {
	*httptest.Server
	requests atomic.Int64
}

func newDownloadHost(t *testing.T, handler http.HandlerFunc) *downloadHost {
	t.Helper()
	host := &downloadHost{}
	host.Server = httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		host.requests.Add(1)
		handler(w, r)
	}))
	t.Cleanup(host.Close)
	return host
}

func serveFiles(files map[string][]byte) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		content, ok := files[r.URL.Path]
		if !ok || r.Header.Get("User-Agent") != "oversee" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Length", strconv.Itoa(len(content)))
		w.Write(content)
	}
}

func sha256Hex(content []byte) string {
	sum := sha256.Sum256(content)
	return hex.EncodeToString(sum[:])
}

func downloadFile(host *downloadHost, name, dest string, content []byte) catalog.File {
	return catalog.File{URL: host.URL + "/" + name, SHA256: sha256Hex(content), Name: name, Dest: dest}
}

func downloadServer(files []catalog.File, bin catalog.Bin) catalog.Server {
	return catalog.Server{
		ID:      "zls",
		Version: "0.14.0",
		Run:     catalog.Run{Bin: "zls"},
		Install: catalog.Install{
			Type:    catalog.InstallDownload,
			Package: "zls",
			Version: "0.14.0",
			Platforms: map[catalog.Platform]catalog.Download{
				testPlatform: {Files: files, Bins: map[string]catalog.Bin{"zls": bin}},
			},
		},
	}
}

func zlsArchive(t *testing.T) []byte {
	t.Helper()
	return gzipTarArchive(t, []archiveEntry{
		fileEntry("zls-x86_64-linux/zls", "#!/bin/sh\n", 0o644),
		fileEntry("zls-x86_64-linux/README.md", "readme", 0o644),
	})
}

var zlsBin = catalog.Bin{Kind: catalog.BinExec, Path: "dist/zls-x86_64-linux/zls"}

func requireEmptyTemp(t *testing.T, home Home) {
	t.Helper()
	entries, err := os.ReadDir(home.TempDir())
	if errors.Is(err, os.ErrNotExist) {
		return
	}
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) > 0 {
		t.Errorf("temp dir keeps %v, want it empty", dirNames(t, home.TempDir()))
	}
}

func TestInstallerDownload(t *testing.T) {
	skipWithoutUnixModes(t)
	archive := zlsArchive(t)
	license := []byte("MIT")
	host := newDownloadHost(t, serveFiles(map[string][]byte{"/zls.tar.gz": archive, "/LICENSE": license}))
	home := Home{root: t.TempDir()}
	server := downloadServer([]catalog.File{downloadFile(host, "zls.tar.gz", "dist", archive), downloadFile(host, "LICENSE", "", license)}, zlsBin)
	progress := &progressLog{}
	started := time.Now().UTC()
	if err := NewInstaller(home, NewToolchain(), host.Client()).Install(t.Context(), server, testPlatform, progress.report); err != nil {
		t.Fatalf("Install: %v", err)
	}
	target := home.InstallDir("zls", "0.14.0")
	installation, err := readManifest(target)
	if err != nil {
		t.Fatalf("manifest: %v", err)
	}
	if installation.ID != "zls" || installation.Version != "0.14.0" || installation.Platform != testPlatform || installation.Bin != zlsBin || installation.Dir != target {
		t.Errorf("manifest = %+v", installation)
	}
	if installation.InstalledAt.Before(started.Add(-time.Second)) || installation.InstalledAt.After(time.Now().Add(time.Second)) {
		t.Errorf("InstalledAt = %v, want the install time", installation.InstalledAt)
	}
	found, ok, err := NewInstallations(home).Find("zls")
	if err != nil || !ok || found.Entry() != filepath.Join(target, "dist", "zls-x86_64-linux", "zls") {
		t.Errorf("Find = %+v, %t, %v", found, ok, err)
	}
	info, err := os.Stat(installation.Entry())
	if err != nil {
		t.Fatal(err)
	}
	if info.Mode().Perm()&0o111 == 0 {
		t.Errorf("entry mode %v, want it made executable", info.Mode().Perm())
	}
	if got := readText(t, filepath.Join(target, "LICENSE")); got != "MIT" {
		t.Errorf("LICENSE = %q", got)
	}
	if got := readText(t, filepath.Join(target, "dist", "zls-x86_64-linux", "README.md")); got != "readme" {
		t.Errorf("README.md = %q", got)
	}
	requireMissing(t, filepath.Join(target, "dist", "zls.tar.gz"))
	requireEmptyTemp(t, home)
	reports := progress.all()
	total := int64(len(archive) + len(license))
	if len(reports) == 0 || reports[0] != (domain.InstallProgress{Total: int64(len(archive))}) {
		t.Fatalf("first report = %v, want the size of the first file", reports)
	}
	if last := reports[len(reports)-1]; last != (domain.InstallProgress{Received: total, Total: total}) {
		t.Errorf("last report = %+v, want %d of %d", last, total, total)
	}
	for index := 1; index < len(reports); index++ {
		if reports[index].Received < reports[index-1].Received || reports[index].Total > total {
			t.Fatalf("reports are not monotonic: %v", reports)
		}
	}
}

func TestInstallerDownloadWithoutAKnownSize(t *testing.T) {
	archive := zlsArchive(t)
	license := []byte("MIT")
	host := newDownloadHost(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/LICENSE" {
			serveFiles(map[string][]byte{"/LICENSE": license})(w, r)
			return
		}
		w.WriteHeader(http.StatusOK)
		w.(http.Flusher).Flush()
		w.Write(archive)
	})
	home := Home{root: t.TempDir()}
	progress := &progressLog{}
	server := downloadServer([]catalog.File{downloadFile(host, "LICENSE", "", license), downloadFile(host, "zls.tar.gz", "dist", archive)}, zlsBin)
	if err := NewInstaller(home, NewToolchain(), host.Client()).Install(t.Context(), server, testPlatform, progress.report); err != nil {
		t.Fatalf("Install: %v", err)
	}
	reports := progress.all()
	sized := slices.IndexFunc(reports, func(report domain.InstallProgress) bool {
		return report == domain.InstallProgress{Received: int64(len(license)), Total: int64(len(license))}
	})
	if sized < 0 {
		t.Fatalf("reports %v, want the sized file reported with its total", reports)
	}
	for _, report := range reports[sized+1:] {
		if report.Total != 0 {
			t.Fatalf("reports %v carry a total once a download has no size", reports)
		}
	}
	if last := reports[len(reports)-1]; last != (domain.InstallProgress{Received: int64(len(license) + len(archive))}) {
		t.Errorf("last report = %+v, want %d received without a total", last, len(license)+len(archive))
	}
}

func TestInstallerDownloadFailures(t *testing.T) {
	skipWithoutUnixModes(t)
	archive := zlsArchive(t)
	tests := []struct {
		name         string
		server       func(host *downloadHost) catalog.Server
		wantErr      string
		wantRequests int64
	}{
		{
			name: "checksum mismatch",
			server: func(host *downloadHost) catalog.Server {
				file := downloadFile(host, "zls.tar.gz", "dist", archive)
				file.SHA256 = sha256Hex([]byte("another archive"))
				return downloadServer([]catalog.File{file}, zlsBin)
			},
			wantErr:      "does not match",
			wantRequests: 1,
		},
		{
			name: "missing file",
			server: func(host *downloadHost) catalog.Server {
				return downloadServer([]catalog.File{downloadFile(host, "missing.tar.gz", "dist", archive)}, zlsBin)
			},
			wantErr:      "status 404",
			wantRequests: 1,
		},
		{
			name: "the entry file is not in the archive",
			server: func(host *downloadHost) catalog.Server {
				return downloadServer([]catalog.File{downloadFile(host, "zls.tar.gz", "dist", archive)}, catalog.Bin{Kind: catalog.BinExec, Path: "dist/zls"})
			},
			wantErr:      "zls did not install dist/zls",
			wantRequests: 1,
		},
		{
			name: "the entry is a directory",
			server: func(host *downloadHost) catalog.Server {
				return downloadServer([]catalog.File{downloadFile(host, "zls.tar.gz", "dist", archive)}, catalog.Bin{Kind: catalog.BinExec, Path: "dist/zls-x86_64-linux"})
			},
			wantErr:      "is not a file",
			wantRequests: 1,
		},
		{
			name: "no build for the platform",
			server: func(host *downloadHost) catalog.Server {
				server := downloadServer([]catalog.File{downloadFile(host, "zls.tar.gz", "dist", archive)}, zlsBin)
				server.Install.Platforms = map[catalog.Platform]catalog.Download{catalog.PlatformWindowsX64: server.Install.Platforms[testPlatform]}
				return server
			},
			wantErr: "zls has no build for " + string(testPlatform),
		},
		{
			name: "a file that is not served over https",
			server: func(host *downloadHost) catalog.Server {
				file := downloadFile(host, "zls.tar.gz", "dist", archive)
				file.URL = strings.Replace(file.URL, "https://", "http://", 1)
				return downloadServer([]catalog.File{file}, zlsBin)
			},
			wantErr: "is not served over https",
		},
		{
			name: "a file name with a path",
			server: func(host *downloadHost) catalog.Server {
				file := downloadFile(host, "zls.tar.gz", "dist", archive)
				file.Name = "../zls.tar.gz"
				return downloadServer([]catalog.File{file}, zlsBin)
			},
			wantErr: "is not a plain file name",
		},
		{
			name: "an unknown install type",
			server: func(host *downloadHost) catalog.Server {
				server := downloadServer(nil, zlsBin)
				server.Install.Type = "cargo"
				return server
			},
			wantErr: `unsupported install type "cargo"`,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			host := newDownloadHost(t, serveFiles(map[string][]byte{"/zls.tar.gz": archive}))
			home := Home{root: t.TempDir()}
			err := NewInstaller(home, NewToolchain(), host.Client()).Install(t.Context(), test.server(host), testPlatform, (&progressLog{}).report)
			if err == nil || !strings.Contains(err.Error(), test.wantErr) {
				t.Fatalf("Install error = %v, want %q", err, test.wantErr)
			}
			if requests := host.requests.Load(); requests != test.wantRequests {
				t.Errorf("requests = %d, want %d", requests, test.wantRequests)
			}
			requireMissing(t, home.ServerDir("zls"))
			requireEmptyTemp(t, home)
		})
	}
}

func TestInstallerSkipsAnInstalledVersion(t *testing.T) {
	host := newDownloadHost(t, serveFiles(nil))
	home := Home{root: t.TempDir()}
	installFixture(t, home, "zls", "0.14.0", installedAt)
	server := downloadServer([]catalog.File{downloadFile(host, "zls.tar.gz", "dist", []byte("archive"))}, zlsBin)
	if err := NewInstaller(home, NewToolchain(), host.Client()).Install(t.Context(), server, testPlatform, (&progressLog{}).report); err != nil {
		t.Fatalf("Install: %v", err)
	}
	if requests := host.requests.Load(); requests != 0 {
		t.Errorf("requests = %d, want none for an installed version", requests)
	}
	requireMissing(t, home.TempDir())
}

func TestInstallerCancelDuringDownload(t *testing.T) {
	archive := zlsArchive(t)
	host := newDownloadHost(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Length", strconv.Itoa(len(archive)))
		w.Write(archive[:len(archive)/2])
		w.(http.Flusher).Flush()
		<-r.Context().Done()
	})
	home := Home{root: t.TempDir()}
	ctx, cancel := context.WithCancel(t.Context())
	defer cancel()
	progress := &progressLog{onWrite: func(progress domain.InstallProgress) {
		if progress.Received > 0 {
			cancel()
		}
	}}
	server := downloadServer([]catalog.File{downloadFile(host, "zls.tar.gz", "dist", archive)}, zlsBin)
	err := NewInstaller(home, NewToolchain(), host.Client()).Install(ctx, server, testPlatform, progress.report)
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("Install error = %v, want context.Canceled", err)
	}
	requireMissing(t, home.ServerDir("zls"))
	requireEmptyTemp(t, home)
}

func TestInstallerRemovesStaleTemp(t *testing.T) {
	archive := zlsArchive(t)
	host := newDownloadHost(t, serveFiles(map[string][]byte{"/zls.tar.gz": archive}))
	home := Home{root: t.TempDir()}
	stale := filepath.Join(home.TempDir(), "gopls-stale")
	fresh := filepath.Join(home.TempDir(), "gopls-running")
	mkdirs(t, stale, fresh)
	old := time.Now().Add(-staleTempAge - time.Hour)
	if err := os.Chtimes(stale, old, old); err != nil {
		t.Fatal(err)
	}
	server := downloadServer([]catalog.File{downloadFile(host, "zls.tar.gz", "dist", archive)}, zlsBin)
	if err := NewInstaller(home, NewToolchain(), host.Client()).Install(t.Context(), server, testPlatform, (&progressLog{}).report); err != nil {
		t.Fatalf("Install: %v", err)
	}
	requireMissing(t, stale)
	if names := dirNames(t, home.TempDir()); !slices.Equal(names, []string{"gopls-running"}) {
		t.Errorf("temp dir keeps %v, want only the running install", names)
	}
}

func workInstallation(t *testing.T, home Home, marker string) Installation {
	t.Helper()
	mkdirs(t, home.TempDir())
	work, err := os.MkdirTemp(home.TempDir(), "zls-")
	if err != nil {
		t.Fatal(err)
	}
	installation := Installation{ID: "zls", Version: "0.14.0", Platform: testPlatform, InstalledAt: installedAt, Bin: zlsBin, Dir: work}
	if err := writeManifest(installation); err != nil {
		t.Fatal(err)
	}
	writeText(t, filepath.Join(work, marker), marker)
	return installation
}

func TestInstallerMoveIntoPlace(t *testing.T) {
	t.Run("the first rename wins", func(t *testing.T) {
		home := Home{root: t.TempDir()}
		target := home.InstallDir("zls", "0.14.0")
		installFixture(t, home, "zls", "0.14.0", installedAt)
		writeText(t, filepath.Join(target, "winner.txt"), "winner")
		loser := workInstallation(t, home, "loser.txt")
		if err := NewInstaller(home, NewToolchain(), nil).moveIntoPlace(loser, target); err != nil {
			t.Fatalf("moveIntoPlace: %v", err)
		}
		if got := readText(t, filepath.Join(target, "winner.txt")); got != "winner" {
			t.Errorf("winner.txt = %q", got)
		}
		requireMissing(t, filepath.Join(target, "loser.txt"))
	})
	t.Run("a leftover without a manifest is replaced", func(t *testing.T) {
		home := Home{root: t.TempDir()}
		target := home.InstallDir("zls", "0.14.0")
		writeText(t, filepath.Join(target, "partial.txt"), "partial")
		installation := workInstallation(t, home, "complete.txt")
		if err := NewInstaller(home, NewToolchain(), nil).moveIntoPlace(installation, target); err != nil {
			t.Fatalf("moveIntoPlace: %v", err)
		}
		requireMissing(t, filepath.Join(target, "partial.txt"))
		requireMissing(t, installation.Dir)
		if _, err := readManifest(target); err != nil {
			t.Errorf("manifest: %v", err)
		}
		if got := readText(t, filepath.Join(target, "complete.txt")); got != "complete.txt" {
			t.Errorf("complete.txt = %q", got)
		}
	})
}

func TestInstallerLosesToAnInstallThatFinishedFirst(t *testing.T) {
	archive := zlsArchive(t)
	host := newDownloadHost(t, serveFiles(map[string][]byte{"/zls.tar.gz": archive}))
	home := Home{root: t.TempDir()}
	target := home.InstallDir("zls", "0.14.0")
	var winner sync.Once
	progress := &progressLog{onWrite: func(domain.InstallProgress) {
		winner.Do(func() {
			installFixture(t, home, "zls", "0.14.0", installedAt)
			writeText(t, filepath.Join(target, "winner.txt"), "winner")
		})
	}}
	server := downloadServer([]catalog.File{downloadFile(host, "zls.tar.gz", "dist", archive)}, zlsBin)
	if err := NewInstaller(home, NewToolchain(), host.Client()).Install(t.Context(), server, testPlatform, progress.report); err != nil {
		t.Fatalf("Install: %v", err)
	}
	if got := readText(t, filepath.Join(target, "winner.txt")); got != "winner" {
		t.Errorf("winner.txt = %q, want the first install kept", got)
	}
	requireMissing(t, filepath.Join(target, "dist"))
	requireEmptyTemp(t, home)
}

func TestInstallerConcurrentInstalls(t *testing.T) {
	archive := zlsArchive(t)
	arrived := make(chan struct{}, 2)
	release := make(chan struct{})
	host := newDownloadHost(t, func(w http.ResponseWriter, r *http.Request) {
		arrived <- struct{}{}
		select {
		case <-release:
		case <-r.Context().Done():
			return
		}
		serveFiles(map[string][]byte{"/zls.tar.gz": archive})(w, r)
	})
	home := Home{root: t.TempDir()}
	server := downloadServer([]catalog.File{downloadFile(host, "zls.tar.gz", "dist", archive)}, zlsBin)
	errs := make([]error, 2)
	var group sync.WaitGroup
	for index := range errs {
		group.Go(func() {
			errs[index] = NewInstaller(home, NewToolchain(), host.Client()).Install(t.Context(), server, testPlatform, (&progressLog{}).report)
		})
	}
	for range 2 {
		select {
		case <-arrived:
		case <-time.After(10 * time.Second):
			close(release)
			group.Wait()
			t.Fatal("both installs did not reach the download")
		}
	}
	close(release)
	group.Wait()
	for index, err := range errs {
		if err != nil {
			t.Errorf("install %d: %v", index, err)
		}
	}
	if names := dirNames(t, home.ServerDir("zls")); !slices.Equal(names, []string{"0.14.0"}) {
		t.Errorf("server dir keeps %v, want [0.14.0]", names)
	}
	if _, err := readManifest(home.InstallDir("zls", "0.14.0")); err != nil {
		t.Errorf("manifest: %v", err)
	}
	if _, err := os.Stat(filepath.Join(home.InstallDir("zls", "0.14.0"), "dist", "zls-x86_64-linux", "zls")); err != nil {
		t.Errorf("entry: %v", err)
	}
	requireEmptyTemp(t, home)
}

const npmScript = `printf '%s\n' "$@" > "$0.args"
pwd -P > "$0.pwd"
echo "npm http fetch GET 200 https://registry.npmjs.org/typescript-language-server 12ms (cache miss)"
echo "npm warn deprecated inflight@1.0.6" >&2
mkdir -p node_modules/typescript-language-server/lib node_modules/.bin
echo '#!/usr/bin/env node' > node_modules/typescript-language-server/lib/cli.mjs
ln -s ../typescript-language-server/lib/cli.mjs node_modules/.bin/typescript-language-server
`

const goScript = `printf '%s\n' "$@" > "$0.args"
pwd -P > "$0.pwd"
echo "$GOBIN" > "$0.gobin"
echo "golang.org/x/tools/gopls" >&2
mkdir -p "$GOBIN"
echo '#!/bin/sh' > "$GOBIN/gopls"
chmod 755 "$GOBIN/gopls"
`

func npmServer() catalog.Server {
	return catalog.Server{
		ID:      "typescript-language-server",
		Version: "4.3.3",
		Run:     catalog.Run{Bin: "typescript-language-server"},
		Install: catalog.Install{
			Type:          catalog.InstallNpm,
			Package:       "typescript-language-server",
			Version:       "4.3.3",
			ExtraPackages: []string{"typescript@5.6.3"},
			Bins:          map[string]catalog.Bin{"typescript-language-server": {Kind: catalog.BinNpm, Path: "typescript-language-server"}},
		},
	}
}

func goServer() catalog.Server {
	return catalog.Server{
		ID:      "gopls",
		Version: "0.20.0",
		Run:     catalog.Run{Bin: "gopls"},
		Install: catalog.Install{
			Type:    catalog.InstallGolang,
			Package: "golang.org/x/tools/gopls",
			Version: "v0.20.0",
			Bins:    map[string]catalog.Bin{"gopls": {Kind: catalog.BinGolang, Path: "gopls"}},
		},
	}
}

func recordedLines(t *testing.T, path string) []string {
	t.Helper()
	return strings.Split(strings.TrimSuffix(readText(t, path), "\n"), "\n")
}

func ranInWorkDir(t *testing.T, home Home, tool string) string {
	t.Helper()
	physical := strings.TrimSpace(readText(t, tool+".pwd"))
	if filepath.Dir(physical) != realPath(t, home.TempDir()) {
		t.Fatalf("the tool ran in %s, want a work dir under %s", physical, home.TempDir())
	}
	return filepath.Join(home.TempDir(), filepath.Base(physical))
}

func TestInstallerNpm(t *testing.T) {
	skipWithoutUnixModes(t)
	npm := writeExecutable(t, fakeToolPath(t), "npm", shellScript(npmScript))
	home := Home{root: t.TempDir()}
	progress := &progressLog{}
	if err := NewInstaller(home, NewToolchain(), nil).Install(t.Context(), npmServer(), testPlatform, progress.report); err != nil {
		t.Fatalf("Install: %v", err)
	}
	work := ranInWorkDir(t, home, npm)
	want := []string{"install", "--prefix", work, "--no-audit", "--no-fund", "--ignore-scripts", "--loglevel=http", "typescript-language-server@4.3.3", "typescript@5.6.3"}
	if args := recordedLines(t, npm+".args"); !slices.Equal(args, want) {
		t.Errorf("npm args = %q, want %q", args, want)
	}
	installation, found, err := NewInstallations(home).Find("typescript-language-server")
	if err != nil || !found {
		t.Fatalf("Find = %t, %v", found, err)
	}
	if installation.Bin != (catalog.Bin{Kind: catalog.BinNpm, Path: "typescript-language-server"}) {
		t.Errorf("bin = %+v", installation.Bin)
	}
	if got := readText(t, installation.Entry()); got != "#!/usr/bin/env node\n" {
		t.Errorf("entry = %q, want the linked cli", got)
	}
	requireMissing(t, work)
	requireEmptyTemp(t, home)
	if reports := progress.all(); len(reports) == 0 {
		t.Error("npm output reported no activity")
	}
}

func TestInstallerGolang(t *testing.T) {
	skipWithoutUnixModes(t)
	goTool := writeExecutable(t, fakeToolPath(t), "go", shellScript(goScript))
	home := Home{root: t.TempDir()}
	progress := &progressLog{}
	if err := NewInstaller(home, NewToolchain(), nil).Install(t.Context(), goServer(), testPlatform, progress.report); err != nil {
		t.Fatalf("Install: %v", err)
	}
	work := ranInWorkDir(t, home, goTool)
	if args := recordedLines(t, goTool+".args"); !slices.Equal(args, []string{"install", "-v", "golang.org/x/tools/gopls@v0.20.0"}) {
		t.Errorf("go args = %q", args)
	}
	if gobin := strings.TrimSpace(readText(t, goTool+".gobin")); gobin != filepath.Join(work, "bin") {
		t.Errorf("GOBIN = %s, want %s", gobin, filepath.Join(work, "bin"))
	}
	installation, found, err := NewInstallations(home).Find("gopls")
	if err != nil || !found {
		t.Fatalf("Find = %t, %v", found, err)
	}
	if installation.Entry() != filepath.Join(home.InstallDir("gopls", "0.20.0"), "bin", "gopls") {
		t.Errorf("entry = %s", installation.Entry())
	}
	if _, err := os.Stat(installation.Entry()); err != nil {
		t.Errorf("entry: %v", err)
	}
	requireEmptyTemp(t, home)
	if reports := progress.all(); len(reports) == 0 {
		t.Error("go output reported no activity")
	}
}

func TestInstallerCommandFailures(t *testing.T) {
	skipWithoutUnixModes(t)
	tests := []struct {
		name    string
		tools   map[string]string
		server  catalog.Server
		wantErr []string
	}{
		{name: "npm is not on PATH", server: npmServer(), wantErr: []string{"npm is not on PATH"}},
		{name: "go is not on PATH", server: goServer(), wantErr: []string{"go is not on PATH"}},
		{
			name:    "npm fails",
			tools:   map[string]string{"npm": "i=0\nwhile [ $i -lt 200 ]; do echo 'npm http fetch GET 200 https://registry.npmjs.org/package'; i=$((i+1)); done\necho 'npm error 404 Not Found - typescript-language-server@9.9.9' >&2\nexit 1\n"},
			server:  npmServer(),
			wantErr: []string{"npm install: exit status 1", "npm error 404 Not Found"},
		},
		{
			name:    "go install succeeds without the bin",
			tools:   map[string]string{"go": "echo 'go: downloading golang.org/x/tools/gopls v0.20.0'\n"},
			server:  goServer(),
			wantErr: []string{"gopls did not install gopls"},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			dir := fakeToolPath(t)
			for name, script := range test.tools {
				writeExecutable(t, dir, name, shellScript(script))
			}
			home := Home{root: t.TempDir()}
			err := NewInstaller(home, NewToolchain(), nil).Install(t.Context(), test.server, testPlatform, (&progressLog{}).report)
			if err == nil {
				t.Fatal("Install succeeded")
			}
			for _, want := range test.wantErr {
				if !strings.Contains(err.Error(), want) {
					t.Errorf("Install error = %v, want %q", err, want)
				}
			}
			if len(err.Error()) > outputLimit+256 {
				t.Errorf("error has %d bytes, want the output cut to its last %d", len(err.Error()), outputLimit)
			}
			requireMissing(t, home.ServerDir(test.server.ID))
			requireEmptyTemp(t, home)
		})
	}
}

func TestInstallerCancelDuringCommand(t *testing.T) {
	skipWithoutUnixModes(t)
	writeExecutable(t, fakeToolPath(t), "npm", shellScript("echo 'npm http fetch GET 200 https://registry.npmjs.org/typescript-language-server'\nexec sleep 30\n"))
	home := Home{root: t.TempDir()}
	ctx, cancel := context.WithCancel(t.Context())
	defer cancel()
	progress := &progressLog{onWrite: func(domain.InstallProgress) {
		cancel()
	}}
	started := time.Now()
	err := NewInstaller(home, NewToolchain(), nil).Install(ctx, npmServer(), testPlatform, progress.report)
	if err == nil {
		t.Fatal("Install succeeded after the cancel")
	}
	if elapsed := time.Since(started); elapsed > 10*time.Second {
		t.Errorf("Install took %v after the cancel", elapsed)
	}
	requireMissing(t, home.ServerDir("typescript-language-server"))
	requireEmptyTemp(t, home)
}

func TestOutputTail(t *testing.T) {
	tail := &outputTail{limit: 8}
	for _, chunk := range []string{"0123", "456789", "ab"} {
		if written, err := tail.Write([]byte(chunk)); err != nil || written != len(chunk) {
			t.Fatalf("Write(%q) = %d, %v", chunk, written, err)
		}
	}
	if got := tail.String(); got != "456789ab" {
		t.Errorf("tail = %q, want the last 8 bytes", got)
	}
}
