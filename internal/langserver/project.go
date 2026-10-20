package langserver

import (
	"os"
	"path/filepath"

	"github.com/obsfx/oversee/internal/domain"
)

const readLimit = 8 << 20

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
	info, err := os.Stat(file)
	if err != nil || !info.Mode().IsRegular() || info.Size() > readLimit {
		return nil
	}
	content, err := os.ReadFile(file)
	if err != nil {
		return nil
	}
	return content
}
