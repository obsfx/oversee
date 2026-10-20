package langserver

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"

	"github.com/obsfx/oversee/internal/catalog"
	"github.com/obsfx/oversee/internal/domain"
)

const (
	staleTempAge = 24 * time.Hour
	outputLimit  = 4096
	commandGrace = 5 * time.Second
)

type Installer struct {
	home      Home
	toolchain Toolchain
	client    *http.Client
}

func NewInstaller(home Home, toolchain Toolchain, client *http.Client) *Installer {
	return &Installer{home: home, toolchain: toolchain, client: client}
}

func (i *Installer) Install(ctx context.Context, server catalog.Server, platform catalog.Platform, progress func(domain.InstallProgress)) error {
	target := i.home.InstallDir(server.ID, server.Version)
	if _, err := readManifest(target); err == nil {
		return nil
	}
	if err := os.MkdirAll(i.home.TempDir(), 0o755); err != nil {
		return err
	}
	i.removeStaleTemp()
	work, err := os.MkdirTemp(i.home.TempDir(), server.ID+"-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(work)
	bin, err := i.populate(ctx, work, server, platform, &progressTracker{report: progress})
	if err != nil {
		return err
	}
	installation := Installation{
		ID:          server.ID,
		Version:     server.Version,
		Platform:    platform,
		InstalledAt: time.Now().UTC(),
		Bin:         bin,
		Dir:         work,
	}
	if err := installation.prepareEntry(); err != nil {
		return err
	}
	if err := writeManifest(installation); err != nil {
		return err
	}
	return i.moveIntoPlace(installation, target)
}

func (i *Installer) populate(ctx context.Context, work string, server catalog.Server, platform catalog.Platform, tracker *progressTracker) (catalog.Bin, error) {
	switch server.Install.Type {
	case catalog.InstallNpm:
		args := []string{"install", "--prefix", work, "--no-audit", "--no-fund", "--ignore-scripts", "--loglevel=http", server.Install.Package + "@" + server.Install.Version}
		if err := i.run(ctx, work, catalog.RequiresNpm, append(args, server.Install.ExtraPackages...), nil, tracker); err != nil {
			return catalog.Bin{}, err
		}
		return server.Install.Bins[server.Run.Bin], nil
	case catalog.InstallGolang:
		args := []string{"install", "-v", server.Install.Package + "@" + server.Install.Version}
		if err := i.run(ctx, work, catalog.RequiresGo, args, []string{"GOBIN=" + filepath.Join(work, "bin")}, tracker); err != nil {
			return catalog.Bin{}, err
		}
		return server.Install.Bins[server.Run.Bin], nil
	case catalog.InstallDownload:
		download, ok := server.Install.DownloadFor(platform)
		if !ok {
			return catalog.Bin{}, fmt.Errorf("%s has no build for %s", server.ID, platform)
		}
		for _, file := range download.Files {
			if err := i.fetch(ctx, work, file, tracker); err != nil {
				return catalog.Bin{}, err
			}
		}
		return download.Bins[server.Run.Bin], nil
	default:
		return catalog.Bin{}, fmt.Errorf("unsupported install type %q", server.Install.Type)
	}
}

func (i *Installer) run(ctx context.Context, dir string, tool catalog.Requirement, args []string, env []string, tracker *progressTracker) error {
	program, err := i.toolchain.Command(tool)
	if err != nil {
		return err
	}
	command := exec.CommandContext(ctx, program, args...)
	command.Dir = dir
	command.Env = append(os.Environ(), env...)
	command.WaitDelay = commandGrace
	output := &outputTail{limit: outputLimit}
	writer := io.MultiWriter(output, outputActivity{tracker: tracker})
	command.Stdout = writer
	command.Stderr = writer
	if err := command.Run(); err != nil {
		return fmt.Errorf("%s %s: %w\n%s", tool, args[0], err, output.String())
	}
	return nil
}

func (i *Installer) fetch(ctx context.Context, work string, file catalog.File, tracker *progressTracker) error {
	if err := file.Validate(); err != nil {
		return err
	}
	dir := filepath.Join(work, filepath.FromSlash(file.Dest))
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	path := filepath.Join(dir, file.Name)
	if err := i.download(ctx, file, path, tracker); err != nil {
		return err
	}
	return extractArchive(path)
}

func (i *Installer) download(ctx context.Context, file catalog.File, path string, tracker *progressTracker) error {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, file.URL, nil)
	if err != nil {
		return err
	}
	request.Header.Set("User-Agent", "oversee")
	response, err := i.client.Do(request)
	if err != nil {
		return fmt.Errorf("download %s: %w", file.URL, err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("download %s: status %s", file.URL, response.Status)
	}
	out, err := os.Create(path)
	if err != nil {
		return err
	}
	hash := sha256.New()
	tracker.expect(response.ContentLength)
	_, copyErr := io.Copy(io.MultiWriter(out, hash, tracker), response.Body)
	if err := errors.Join(copyErr, out.Close()); err != nil {
		return fmt.Errorf("download %s: %w", file.URL, err)
	}
	if sum := hex.EncodeToString(hash.Sum(nil)); sum != file.SHA256 {
		return fmt.Errorf("download %s: checksum %s does not match %s", file.URL, sum, file.SHA256)
	}
	return nil
}

func (i *Installer) moveIntoPlace(installation Installation, target string) error {
	if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
		return err
	}
	err := os.Rename(installation.Dir, target)
	if err == nil {
		return nil
	}
	if _, readErr := readManifest(target); readErr == nil {
		return nil
	}
	if removeErr := os.RemoveAll(target); removeErr != nil {
		return errors.Join(err, removeErr)
	}
	if err := os.Rename(installation.Dir, target); err != nil {
		return fmt.Errorf("move %s into place: %w", installation.ID, err)
	}
	return nil
}

func (i *Installer) removeStaleTemp() {
	entries, err := os.ReadDir(i.home.TempDir())
	if err != nil {
		return
	}
	for _, entry := range entries {
		info, err := entry.Info()
		if err == nil && time.Since(info.ModTime()) > staleTempAge {
			os.RemoveAll(filepath.Join(i.home.TempDir(), entry.Name()))
		}
	}
}

func (i Installation) prepareEntry() error {
	root, err := os.OpenRoot(i.Dir)
	if err != nil {
		return err
	}
	defer root.Close()
	entry := i.entryPath()
	info, err := root.Stat(entry)
	if err != nil {
		return fmt.Errorf("%s did not install %s: %w", i.ID, i.Bin.Path, err)
	}
	if !info.Mode().IsRegular() {
		return fmt.Errorf("%s entry %s is not a file", i.ID, i.Bin.Path)
	}
	if runtime.GOOS == "windows" || i.Bin.Kind != catalog.BinExec || info.Mode()&0o111 != 0 {
		return nil
	}
	return root.Chmod(entry, info.Mode()|0o755)
}

type progressTracker struct {
	progress domain.InstallProgress
	unsized  bool
	report   func(domain.InstallProgress)
}

func (t *progressTracker) expect(length int64) {
	if length <= 0 {
		t.unsized = true
	} else {
		t.progress.Total += length
	}
	t.report(t.current())
}

func (t *progressTracker) Write(chunk []byte) (int, error) {
	t.progress.Received += int64(len(chunk))
	t.report(t.current())
	return len(chunk), nil
}

func (t *progressTracker) touch() {
	t.report(t.current())
}

func (t *progressTracker) current() domain.InstallProgress {
	if t.unsized {
		return domain.InstallProgress{Received: t.progress.Received}
	}
	return t.progress
}

type outputActivity struct {
	tracker *progressTracker
}

func (a outputActivity) Write(chunk []byte) (int, error) {
	a.tracker.touch()
	return len(chunk), nil
}

type outputTail struct {
	limit int
	data  []byte
}

func (o *outputTail) Write(chunk []byte) (int, error) {
	o.data = append(o.data, chunk...)
	if extra := len(o.data) - o.limit; extra > 0 {
		o.data = o.data[extra:]
	}
	return len(chunk), nil
}

func (o *outputTail) String() string {
	return string(o.data)
}
