package langserver

import (
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"

	"github.com/obsfx/oversee/internal/domain"
)

const ReadLimit = 8 << 20

type FileTooLargeError struct {
	LimitMiB int
}

func (e FileTooLargeError) Error() string {
	return fmt.Sprintf("file is larger than %d MiB", e.LimitMiB)
}

type Project struct {
	roots []string
}

func NewProject(repoRoot string) Project {
	repoRoot = filepath.Clean(repoRoot)
	roots := []string{repoRoot}
	if resolved, err := filepath.EvalSymlinks(repoRoot); err == nil && resolved != repoRoot {
		roots = append(roots, resolved)
	}
	return Project{roots: roots}
}

func (p Project) Path(relative string) string {
	return filepath.Join(p.roots[0], filepath.FromSlash(relative))
}

func (p Project) RootOf(file string, markers []string) string {
	repoRoot := p.roots[0]
	for dir := filepath.Dir(file); ; dir = filepath.Dir(dir) {
		for _, marker := range markers {
			if _, err := os.Stat(filepath.Join(dir, marker)); err == nil {
				return dir
			}
		}
		if dir == repoRoot || filepath.Dir(dir) == dir {
			return repoRoot
		}
	}
}

func (p Project) Relative(file string) (string, bool) {
	candidates := []string{file}
	if resolved, err := filepath.EvalSymlinks(file); err == nil && resolved != file {
		candidates = append(candidates, resolved)
	}
	for _, candidate := range candidates {
		for _, root := range p.roots {
			relative, err := filepath.Rel(root, candidate)
			if err == nil && filepath.IsLocal(relative) {
				return filepath.ToSlash(relative), true
			}
		}
	}
	return "", false
}

func (p Project) Exists(file string) bool {
	_, err := os.Stat(file)
	return err == nil
}

func (p Project) Read(file string) domain.Blob {
	content, err := p.ReadAbsolute(file)
	if err != nil {
		return nil
	}
	return content
}

func (p Project) ReadAbsolute(file string) (domain.Blob, error) {
	return readRegular(os.Stat, os.Open, file)
}

func (p Project) ReadRelative(relative string) (domain.Blob, error) {
	root, err := os.OpenRoot(p.roots[0])
	if err != nil {
		return nil, err
	}
	defer root.Close()
	name := filepath.FromSlash(relative)
	content, err := readRegular(root.Stat, root.Open, name)
	if err != nil && p.unreachable(name) {
		return nil, nil
	}
	return content, err
}

func (p Project) unreachable(name string) bool {
	resolved, err := filepath.EvalSymlinks(filepath.Join(p.roots[0], name))
	if errors.Is(err, fs.ErrNotExist) {
		return true
	}
	if err != nil {
		return false
	}
	_, inside := p.Relative(resolved)
	return !inside
}

func readRegular(stat func(string) (fs.FileInfo, error), open func(string) (*os.File, error), name string) (domain.Blob, error) {
	info, err := stat(name)
	if errors.Is(err, fs.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if !info.Mode().IsRegular() {
		return nil, nil
	}
	if info.Size() > ReadLimit {
		return nil, FileTooLargeError{LimitMiB: ReadLimit >> 20}
	}
	file, err := open(name)
	if errors.Is(err, fs.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	defer file.Close()
	content, err := io.ReadAll(io.LimitReader(file, ReadLimit+1))
	if err != nil {
		return nil, err
	}
	if len(content) > ReadLimit {
		return nil, FileTooLargeError{LimitMiB: ReadLimit >> 20}
	}
	return content, nil
}
