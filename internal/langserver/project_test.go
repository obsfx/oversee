package langserver

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	"github.com/obsfx/oversee/internal/domain"
)

type projectLayout struct {
	base     string
	repo     string
	link     string
	external string
}

func newProjectLayout(t *testing.T) projectLayout {
	t.Helper()
	skipWithoutUnixModes(t)
	base := realPath(t, t.TempDir())
	layout := projectLayout{
		base:     base,
		repo:     filepath.Join(base, "repo"),
		link:     filepath.Join(base, "repo-link"),
		external: filepath.Join(base, "external"),
	}
	writeText(t, filepath.Join(layout.repo, "pkg", "main.go"), "package main\n")
	writeText(t, filepath.Join(layout.external, "secret.txt"), "secret")
	writeText(t, filepath.Join(base, "repo-other", "main.go"), "package other\n")
	if err := os.Symlink(layout.repo, layout.link); err != nil {
		t.Fatal(err)
	}
	return layout
}

func (l projectLayout) at(parts ...string) string {
	return filepath.Join(append([]string{l.repo}, parts...)...)
}

func sizedFile(t *testing.T, path string, size int64) {
	t.Helper()
	writeText(t, path, "")
	if err := os.Truncate(path, size); err != nil {
		t.Fatal(err)
	}
}

func TestProjectRootOf(t *testing.T) {
	layout := newProjectLayout(t)
	writeText(t, layout.at("go.mod"), "module repo\n")
	writeText(t, layout.at("svc", "go.mod"), "module svc\n")
	writeText(t, layout.at("web", "tsconfig.json"), "{}")
	writeText(t, layout.at("package.json"), "{}")
	mkdirs(t, layout.at("svc", "pkg", "deep"), layout.at("web", "src"), layout.at("docs", "guide"))
	project := NewProject(layout.repo)
	tests := []struct {
		name    string
		file    string
		markers []string
		want    string
	}{
		{name: "the nearest marker", file: layout.at("svc", "pkg", "deep", "a.go"), markers: []string{"go.mod"}, want: layout.at("svc")},
		{name: "a marker next to the file", file: layout.at("svc", "a.go"), markers: []string{"go.mod"}, want: layout.at("svc")},
		{name: "any marker of the list, nearest first", file: layout.at("web", "src", "app.ts"), markers: []string{"package.json", "tsconfig.json"}, want: layout.at("web")},
		{name: "no marker on the way falls back to the repo root", file: layout.at("docs", "guide", "a.py"), markers: []string{"pyproject.toml"}, want: layout.repo},
		{name: "no markers", file: layout.at("svc", "a.go"), want: layout.repo},
		{name: "a file at the repo root", file: layout.at("main.go"), markers: []string{"go.mod"}, want: layout.repo},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := project.RootOf(test.file, test.markers); got != test.want {
				t.Errorf("RootOf = %s, want %s", got, test.want)
			}
		})
	}
}

func TestProjectRootOfStopsAtTheRepoRoot(t *testing.T) {
	layout := newProjectLayout(t)
	writeText(t, filepath.Join(layout.base, "go.mod"), "module above\n")
	mkdirs(t, layout.at("cmd"))
	if got := NewProject(layout.repo).RootOf(layout.at("cmd", "main.go"), []string{"go.mod"}); got != layout.repo {
		t.Errorf("RootOf = %s, want the repo root %s instead of the marker above it", got, layout.repo)
	}
}

func TestProjectPath(t *testing.T) {
	layout := newProjectLayout(t)
	tests := []struct {
		name string
		root string
		want string
	}{
		{name: "repo root", root: layout.repo, want: layout.at("pkg", "main.go")},
		{name: "a repo root with a trailing separator", root: layout.repo + string(filepath.Separator), want: layout.at("pkg", "main.go")},
		{name: "a symlinked repo root keeps the path it was given", root: layout.link, want: filepath.Join(layout.link, "pkg", "main.go")},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := NewProject(test.root).Path("pkg/main.go"); got != test.want {
				t.Errorf("Path = %s, want %s", got, test.want)
			}
		})
	}
}

func TestProjectRelative(t *testing.T) {
	layout := newProjectLayout(t)
	tests := []struct {
		name   string
		root   string
		file   string
		want   string
		wantIn bool
	}{
		{name: "a repo file", root: layout.repo, file: layout.at("pkg", "main.go"), want: "pkg/main.go", wantIn: true},
		{name: "a symlinked root and the resolved path a server reports", root: layout.link, file: layout.at("pkg", "main.go"), want: "pkg/main.go", wantIn: true},
		{name: "a symlinked root and a path through the link", root: layout.link, file: filepath.Join(layout.link, "pkg", "main.go"), want: "pkg/main.go", wantIn: true},
		{name: "a real root and a path through a link to it", root: layout.repo, file: filepath.Join(layout.link, "pkg", "main.go"), want: "pkg/main.go", wantIn: true},
		{name: "an external file", root: layout.repo, file: filepath.Join(layout.external, "secret.txt")},
		{name: "a sibling that shares the repo name as a prefix", root: layout.repo, file: filepath.Join(layout.base, "repo-other", "main.go")},
		{name: "the parent of the repo", root: layout.repo, file: layout.base},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, in := NewProject(test.root).Relative(test.file)
			if got != test.want || in != test.wantIn {
				t.Errorf("Relative = %q, %t, want %q, %t", got, in, test.want, test.wantIn)
			}
		})
	}
}

func TestProjectReadRelative(t *testing.T) {
	layout := newProjectLayout(t)
	mkdirs(t, layout.at("empty-dir"))
	writeText(t, layout.at("image.png"), "\x89PNG\x00\x01")
	if err := os.Symlink(filepath.Join("pkg", "main.go"), layout.at("alias.go")); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(filepath.Join(layout.external, "secret.txt"), layout.at("escape.txt")); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(filepath.Join("..", "external", "secret.txt"), layout.at("relative-escape.txt")); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(layout.external, layout.at("external-dir")); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(filepath.Join("pkg", "gone.go"), layout.at("dangling.go")); err != nil {
		t.Fatal(err)
	}
	sizedFile(t, layout.at("at-limit.bin"), ReadLimit)
	sizedFile(t, layout.at("over-limit.bin"), ReadLimit+1)
	tests := []struct {
		name     string
		root     string
		relative string
		want     domain.Blob
		wantErr  bool
	}{
		{name: "a repo file", root: layout.repo, relative: "pkg/main.go", want: domain.Blob("package main\n")},
		{name: "a repo file through a symlinked root", root: layout.link, relative: "pkg/main.go", want: domain.Blob("package main\n")},
		{name: "a link that stays inside the repo", root: layout.repo, relative: "alias.go", want: domain.Blob("package main\n")},
		{name: "a binary file is returned as it is", root: layout.repo, relative: "image.png", want: domain.Blob("\x89PNG\x00\x01")},
		{name: "a missing file", root: layout.repo, relative: "pkg/missing.go"},
		{name: "a directory", root: layout.repo, relative: "empty-dir"},
		{name: "an absolute link out of the repo is missing", root: layout.repo, relative: "escape.txt"},
		{name: "a relative link out of the repo is missing", root: layout.repo, relative: "relative-escape.txt"},
		{name: "a file through a directory link out of the repo is missing", root: layout.repo, relative: "external-dir/secret.txt"},
		{name: "a dangling link is missing", root: layout.repo, relative: "dangling.go"},
		{name: "a path out of the repo is missing", root: layout.repo, relative: "../external/secret.txt"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := NewProject(test.root).ReadRelative(test.relative)
			if (err != nil) != test.wantErr {
				t.Fatalf("ReadRelative error = %v, want error %t", err, test.wantErr)
			}
			if string(got) != string(test.want) || got.Exists() != test.want.Exists() {
				t.Errorf("ReadRelative = %q (exists %t), want %q (exists %t)", got, got.Exists(), test.want, test.want.Exists())
			}
		})
	}
	t.Run("a file at the read limit", func(t *testing.T) {
		got, err := NewProject(layout.repo).ReadRelative("at-limit.bin")
		if err != nil || len(got) != ReadLimit {
			t.Fatalf("ReadRelative = %d bytes, %v, want %d bytes", len(got), err, ReadLimit)
		}
	})
	t.Run("a file over the read limit", func(t *testing.T) {
		got, err := NewProject(layout.repo).ReadRelative("over-limit.bin")
		tooLarge, ok := errors.AsType[FileTooLargeError](err)
		if !ok || tooLarge.LimitMiB != 8 || got != nil {
			t.Fatalf("ReadRelative = %d bytes, %v, want FileTooLargeError of 8 MiB", len(got), err)
		}
		if err.Error() != "file is larger than 8 MiB" {
			t.Errorf("error = %q", err)
		}
	})
}

func TestProjectReadAbsolute(t *testing.T) {
	layout := newProjectLayout(t)
	sizedFile(t, filepath.Join(layout.external, "huge.bin"), ReadLimit+1)
	project := NewProject(layout.repo)
	tests := []struct {
		name     string
		file     string
		want     domain.Blob
		wantRead domain.Blob
		tooLarge bool
	}{
		{name: "an external file", file: filepath.Join(layout.external, "secret.txt"), want: domain.Blob("secret"), wantRead: domain.Blob("secret")},
		{name: "a missing file", file: filepath.Join(layout.external, "missing.txt")},
		{name: "a directory", file: layout.external},
		{name: "a file over the read limit", file: filepath.Join(layout.external, "huge.bin"), tooLarge: true},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := project.ReadAbsolute(test.file)
			if _, ok := errors.AsType[FileTooLargeError](err); ok != test.tooLarge {
				t.Fatalf("ReadAbsolute error = %v, want FileTooLargeError %t", err, test.tooLarge)
			}
			if !test.tooLarge && err != nil {
				t.Fatal(err)
			}
			if string(got) != string(test.want) || got.Exists() != test.want.Exists() {
				t.Errorf("ReadAbsolute = %q, want %q", got, test.want)
			}
			if read := project.Read(test.file); string(read) != string(test.wantRead) || read.Exists() != test.wantRead.Exists() {
				t.Errorf("Read = %q, want %q", read, test.wantRead)
			}
		})
	}
}

func TestProjectExists(t *testing.T) {
	layout := newProjectLayout(t)
	project := NewProject(layout.repo)
	if !project.Exists(layout.at("pkg", "main.go")) || !project.Exists(layout.at("pkg")) {
		t.Error("Exists = false for a file and a directory that exist")
	}
	if project.Exists(layout.at("pkg", "missing.go")) {
		t.Error("Exists = true for a missing file")
	}
}
