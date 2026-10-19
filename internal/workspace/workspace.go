package workspace

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/obsfx/oversee/internal/domain"
)

const (
	dataDirName = ".oversee"
	dbFileName  = "oversee.db"
)

var (
	ErrNotRepository  = errors.New("not inside a git repository")
	ErrNotInitialized = errors.New("oversee is not initialized here, run `oversee init` first")
)

type Workspace struct {
	Dir      string
	RepoRoot string
	GitDir   string
}

func Resolve(ctx context.Context, dir string) (Workspace, error) {
	absolute, err := filepath.Abs(dir)
	if err != nil {
		return Workspace{}, err
	}
	resolved, err := filepath.EvalSymlinks(absolute)
	if err != nil {
		return Workspace{}, err
	}
	output, err := gitOutput(ctx, resolved, "rev-parse", "--show-toplevel", "--absolute-git-dir")
	if err != nil {
		return Workspace{}, ErrNotRepository
	}
	root, gitDir, found := strings.Cut(output, "\n")
	if !found {
		return Workspace{}, ErrNotRepository
	}
	return Workspace{Dir: resolved, RepoRoot: root, GitDir: gitDir}, nil
}

func (w Workspace) Info() domain.WorkspaceInfo {
	return domain.NewWorkspaceInfo(w.Dir, w.RepoRoot)
}

func (w Workspace) DataDir() string {
	return filepath.Join(w.Dir, dataDirName)
}

func (w Workspace) DBPath() string {
	return filepath.Join(w.DataDir(), dbFileName)
}

func (w Workspace) RequireInitialized() error {
	info, err := os.Stat(w.DataDir())
	if errors.Is(err, fs.ErrNotExist) || (err == nil && !info.IsDir()) {
		return ErrNotInitialized
	}
	return err
}

func (w Workspace) Init(ctx context.Context) (created bool, err error) {
	if w.RequireInitialized() == nil {
		return false, w.excludeFromGit(ctx)
	}
	if err := os.MkdirAll(w.DataDir(), 0o755); err != nil {
		return false, err
	}
	return true, w.excludeFromGit(ctx)
}

func (w Workspace) excludeFromGit(ctx context.Context) error {
	excludePath, err := gitOutput(ctx, w.RepoRoot, "rev-parse", "--path-format=absolute", "--git-path", "info/exclude")
	if err != nil {
		return err
	}
	pattern, err := w.excludePattern()
	if err != nil {
		return err
	}
	existing, err := os.ReadFile(excludePath)
	if err != nil && !errors.Is(err, fs.ErrNotExist) {
		return err
	}
	for line := range strings.Lines(string(existing)) {
		if strings.TrimSpace(line) == pattern {
			return nil
		}
	}
	if err := os.MkdirAll(filepath.Dir(excludePath), 0o755); err != nil {
		return err
	}
	file, err := os.OpenFile(excludePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer file.Close()
	prefix := ""
	if len(existing) > 0 && !bytes.HasSuffix(existing, []byte("\n")) {
		prefix = "\n"
	}
	_, err = fmt.Fprintf(file, "%s%s\n", prefix, pattern)
	return err
}

func (w Workspace) excludePattern() (string, error) {
	relative, err := filepath.Rel(w.RepoRoot, w.DataDir())
	if err != nil {
		return "", err
	}
	return "/" + filepath.ToSlash(relative) + "/", nil
}

func gitOutput(ctx context.Context, dir string, args ...string) (string, error) {
	command := exec.CommandContext(ctx, "git", args...)
	command.Dir = dir
	output, err := command.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}
