package git

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"github.com/obsfx/oversee/internal/domain"
)

var uncommittedAgainstMain = domain.Comparison{Source: domain.UncommittedSource, Target: "main"}

func TestChangedLinesOfUncommittedChanges(t *testing.T) {
	cases := []struct {
		name string
		base map[string]string
		edit func(fixture *gitFixture)
		want []domain.LineChanges
	}{
		{
			name: "pure deletion has no new lines",
			base: map[string]string{"app.ts": numbered(1, 2, 3, 4, 5, 6, 7, 8)},
			edit: func(fixture *gitFixture) {
				fixture.write("app.ts", numbered(1, 2, 3, 4, 7, 8))
			},
			want: []domain.LineChanges{
				{Path: "app.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(5, 2, 4, 0)}},
			},
		},
		{
			name: "pure insertion has no old lines",
			base: map[string]string{"app.ts": numbered(1, 2, 3, 4)},
			edit: func(fixture *gitFixture) {
				fixture.write("app.ts", numbered(1, 2, 21, 22, 3, 4))
			},
			want: []domain.LineChanges{
				{Path: "app.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(2, 0, 3, 2)}},
			},
		},
		{
			name: "single line change omits the counts",
			base: map[string]string{"app.ts": numbered(1, 2, 3, 4, 5)},
			edit: func(fixture *gitFixture) {
				fixture.write("app.ts", numbered(1, 2, 30, 4, 5))
			},
			want: []domain.LineChanges{
				{Path: "app.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(3, 1, 3, 1)}},
			},
		},
		{
			name: "separate changes are separate hunks",
			base: map[string]string{"app.ts": numbered(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)},
			edit: func(fixture *gitFixture) {
				fixture.write("app.ts", numbered(1, 20, 3, 4, 5, 6, 7, 8, 90, 10))
			},
			want: []domain.LineChanges{
				{Path: "app.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(2, 1, 2, 1), hunk(9, 1, 9, 1)}},
			},
		},
		{
			name: "staged and unstaged edits both compare with HEAD",
			base: map[string]string{"app.ts": numbered(1, 2, 3, 4, 5, 6)},
			edit: func(fixture *gitFixture) {
				fixture.write("app.ts", numbered(1, 20, 3, 4, 5, 6))
				fixture.run("add", "app.ts")
				fixture.write("app.ts", numbered(1, 20, 3, 4, 5, 60))
			},
			want: []domain.LineChanges{
				{Path: "app.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(2, 1, 2, 1), hunk(6, 1, 6, 1)}},
			},
		},
		{
			name: "changed last line without a final newline",
			base: map[string]string{"app.ts": "first\nsecond"},
			edit: func(fixture *gitFixture) {
				fixture.write("app.ts", "first\nchanged")
			},
			want: []domain.LineChanges{
				{Path: "app.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(2, 1, 2, 1)}},
			},
		},
		{
			name: "adding the final newline changes the last line",
			base: map[string]string{"app.ts": "first\nsecond"},
			edit: func(fixture *gitFixture) {
				fixture.write("app.ts", "first\nsecond\n")
			},
			want: []domain.LineChanges{
				{Path: "app.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(2, 1, 2, 1)}},
			},
		},
		{
			name: "deleted file covers every old line",
			base: map[string]string{"gone.ts": numbered(1, 2, 3)},
			edit: func(fixture *gitFixture) {
				fixture.remove("gone.ts")
			},
			want: []domain.LineChanges{
				{Path: "gone.ts", Status: domain.ChangeDeleted, Hunks: []domain.LineHunk{hunk(1, 3, 0, 0)}},
			},
		},
		{
			name: "staged new file is added",
			base: map[string]string{"keep.ts": numbered(1)},
			edit: func(fixture *gitFixture) {
				fixture.write("staged.ts", numbered(1, 2))
				fixture.run("add", "staged.ts")
			},
			want: []domain.LineChanges{
				{Path: "staged.ts", Status: domain.ChangeAdded, Hunks: []domain.LineHunk{hunk(0, 0, 1, 2)}},
			},
		},
		{
			name: "untracked file is a whole file addition",
			base: map[string]string{"keep.ts": numbered(1)},
			edit: func(fixture *gitFixture) {
				fixture.write("src/feature/new.ts", numbered(1, 2, 3))
			},
			want: []domain.LineChanges{
				{Path: "src/feature/new.ts", Status: domain.ChangeUntracked},
			},
		},
		{
			name: "untracked file without a final newline is a whole file addition",
			base: map[string]string{"keep.ts": numbered(1)},
			edit: func(fixture *gitFixture) {
				fixture.write("new.ts", "first\nsecond")
			},
			want: []domain.LineChanges{
				{Path: "new.ts", Status: domain.ChangeUntracked},
			},
		},
		{
			name: "empty untracked file has no hunks",
			base: map[string]string{"keep.ts": numbered(1)},
			edit: func(fixture *gitFixture) {
				fixture.write("empty.ts", "")
			},
			want: []domain.LineChanges{
				{Path: "empty.ts", Status: domain.ChangeUntracked},
			},
		},
		{
			name: "untracked file with spaces in its path",
			base: map[string]string{"keep.ts": numbered(1)},
			edit: func(fixture *gitFixture) {
				fixture.write("my notes/new file.ts", numbered(1, 2))
			},
			want: []domain.LineChanges{
				{Path: "my notes/new file.ts", Status: domain.ChangeUntracked},
			},
		},
		{
			name: "untracked files whose names git quotes",
			base: map[string]string{"keep.ts": numbered(1)},
			edit: func(fixture *gitFixture) {
				fixture.write("caf\u00e9.ts", numbered(1, 2))
				fixture.write(`quo"te.ts`, numbered(1, 2))
			},
			want: []domain.LineChanges{
				{Path: "caf\u00e9.ts", Status: domain.ChangeUntracked},
				{Path: `quo"te.ts`, Status: domain.ChangeUntracked},
			},
		},
		{
			name: "staged files without hunks are left out",
			base: map[string]string{`old"name.ts`: numbered(1, 2, 3)},
			edit: func(fixture *gitFixture) {
				fixture.write(`bin"ary.png`, "\x00\x01")
				fixture.write(`empty"file.ts`, "")
				fixture.run("add", `bin"ary.png`, `empty"file.ts`)
				fixture.run("mv", `old"name.ts`, `new"name.ts`)
			},
			want: nil,
		},
		{
			name: "ignored files are not changes",
			base: map[string]string{".gitignore": "*.log\n"},
			edit: func(fixture *gitFixture) {
				fixture.write("debug.log", numbered(1))
			},
			want: nil,
		},
		{
			name: "staged rename with changes keeps the previous path",
			base: map[string]string{"old.ts": numbered(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)},
			edit: func(fixture *gitFixture) {
				fixture.run("mv", "old.ts", "new.ts")
				fixture.write("new.ts", numbered(1, 2, 3, 4, 50, 6, 7, 8, 9, 10))
			},
			want: []domain.LineChanges{
				{Path: "new.ts", PreviousPath: "old.ts", Status: domain.ChangeRenamed, Hunks: []domain.LineHunk{hunk(5, 1, 5, 1)}},
			},
		},
		{
			name: "pure rename is left out",
			base: map[string]string{"old.ts": numbered(1, 2, 3)},
			edit: func(fixture *gitFixture) {
				fixture.run("mv", "old.ts", "new.ts")
			},
			want: nil,
		},
		{
			name: "unstaged rename is a deletion and an untracked file",
			base: map[string]string{"old.ts": numbered(1, 2, 3)},
			edit: func(fixture *gitFixture) {
				fixture.rename("old.ts", "new.ts")
			},
			want: []domain.LineChanges{
				{Path: "new.ts", Status: domain.ChangeUntracked},
				{Path: "old.ts", Status: domain.ChangeDeleted, Hunks: []domain.LineHunk{hunk(1, 3, 0, 0)}},
			},
		},
		{
			name: "renamed path with spaces and unicode",
			base: map[string]string{"old café.ts": numbered(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)},
			edit: func(fixture *gitFixture) {
				fixture.run("mv", "old café.ts", "new café.ts")
				fixture.write("new café.ts", numbered(1, 20, 3, 4, 5, 6, 7, 8, 9, 10))
			},
			want: []domain.LineChanges{
				{Path: "new café.ts", PreviousPath: "old café.ts", Status: domain.ChangeRenamed, Hunks: []domain.LineHunk{hunk(2, 1, 2, 1)}},
			},
		},
		{
			name: "modified paths with spaces and unicode",
			base: map[string]string{"docs/my notes.ts": numbered(1, 2), "café.ts": numbered(1, 2)},
			edit: func(fixture *gitFixture) {
				fixture.write("docs/my notes.ts", numbered(1, 20))
				fixture.write("café.ts", numbered(10, 2))
			},
			want: []domain.LineChanges{
				{Path: "café.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(1, 1, 1, 1)}},
				{Path: "docs/my notes.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(2, 1, 2, 1)}},
			},
		},
		{
			name: "modified paths that git quotes",
			base: map[string]string{`quo"te.ts`: numbered(1, 2), "tab\there.ts": numbered(1, 2), `back\slash.ts`: numbered(1, 2)},
			edit: func(fixture *gitFixture) {
				fixture.write(`quo"te.ts`, numbered(1, 20))
				fixture.write("tab\there.ts", numbered(10, 2))
				fixture.write(`back\slash.ts`, numbered(10, 20))
			},
			want: []domain.LineChanges{
				{Path: `back\slash.ts`, Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(1, 2, 1, 2)}},
				{Path: `quo"te.ts`, Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(2, 1, 2, 1)}},
				{Path: "tab\there.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(1, 1, 1, 1)}},
			},
		},
		{
			name: "modified binary file is left out",
			base: map[string]string{"logo.png": "\x00\x01\x02"},
			edit: func(fixture *gitFixture) {
				fixture.write("logo.png", "\x00\x03")
			},
			want: nil,
		},
		{
			name: "staged binary file is left out",
			base: map[string]string{"keep.ts": numbered(1)},
			edit: func(fixture *gitFixture) {
				fixture.write("icon.png", "\x00\x01")
				fixture.run("add", "icon.png")
			},
			want: nil,
		},
		{
			name: "deleted binary file is left out",
			base: map[string]string{"logo.png": "\x00\x01\x02"},
			edit: func(fixture *gitFixture) {
				fixture.remove("logo.png")
			},
			want: nil,
		},
		{
			name: "untracked binary file has no hunks",
			base: map[string]string{"keep.ts": numbered(1)},
			edit: func(fixture *gitFixture) {
				fixture.write("icon.png", "\x00\x01")
			},
			want: []domain.LineChanges{
				{Path: "icon.png", Status: domain.ChangeUntracked},
			},
		},
		{
			name: "mode change is left out",
			base: map[string]string{"run.sh": "echo hello\n"},
			edit: func(fixture *gitFixture) {
				fixture.chmod("run.sh", 0o755)
			},
			want: nil,
		},
		{
			name: "clean working tree has no changes",
			base: map[string]string{"app.ts": numbered(1, 2)},
			edit: func(*gitFixture) {},
			want: nil,
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			fixture := newGitFixture(t)
			for path, content := range c.base {
				fixture.write(path, content)
			}
			fixture.commitAll("base")
			c.edit(fixture)
			assertLineChanges(t, changedLinesOf(t, fixture, uncommittedAgainstMain), c.want)
		})
	}
}

func TestChangedLinesOfBranchComparisons(t *testing.T) {
	fixture := newGitFixture(t)
	fixture.write("app.ts", numbered(1, 2, 3, 4, 5, 6))
	fixture.write("shared.ts", "shared one\nshared two\n")
	fixture.commitAll("base")
	fixture.run("switch", "--quiet", "--create", "feature")
	fixture.write("app.ts", numbered(1, 20, 3, 4, 5, 6))
	fixture.write("feature.ts", "feature\n")
	fixture.remove("shared.ts")
	fixture.commitAll("feature work")
	fixture.run("switch", "--quiet", "main")
	fixture.write("app.ts", numbered(1, 2, 3, 4, 5, 60))
	fixture.write("main.ts", "main one\nmain two\n")
	fixture.commitAll("main moves on")
	fixture.run("switch", "--quiet", "feature")
	fixture.write("app.ts", numbered(10, 20, 3, 4, 5, 6))
	fixture.write("scratch.ts", numbered(1))

	cases := []struct {
		name       string
		comparison domain.Comparison
		want       []domain.LineChanges
	}{
		{
			name:       "source commits since the merge base without the working tree",
			comparison: domain.Comparison{Source: "feature", Target: "main"},
			want: []domain.LineChanges{
				{Path: "app.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(2, 1, 2, 1)}},
				{Path: "feature.ts", Status: domain.ChangeAdded, Hunks: []domain.LineHunk{hunk(0, 0, 1, 1)}},
				{Path: "shared.ts", Status: domain.ChangeDeleted, Hunks: []domain.LineHunk{hunk(1, 2, 0, 0)}},
			},
		},
		{
			name:       "target commits since the merge base when the branches swap",
			comparison: domain.Comparison{Source: "main", Target: "feature"},
			want: []domain.LineChanges{
				{Path: "app.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(6, 1, 6, 1)}},
				{Path: "main.ts", Status: domain.ChangeAdded, Hunks: []domain.LineHunk{hunk(0, 0, 1, 2)}},
			},
		},
		{
			name:       "uncommitted changes compare with HEAD whatever the target",
			comparison: uncommittedAgainstMain,
			want: []domain.LineChanges{
				{Path: "app.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(1, 1, 1, 1)}},
				{Path: "scratch.ts", Status: domain.ChangeUntracked},
			},
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			assertLineChanges(t, changedLinesOf(t, fixture, c.comparison), c.want)
		})
	}
}

func TestChangedLinesWithoutSharedHistoryDiffAgainstTheTarget(t *testing.T) {
	fixture := newGitFixture(t)
	fixture.write("main.ts", "main one\nmain two\n")
	fixture.commitAll("main")
	fixture.run("switch", "--quiet", "--orphan", "lonely")
	fixture.write("lonely.ts", "lonely\n")
	fixture.commitAll("lonely")

	got := changedLinesOf(t, fixture, domain.Comparison{Source: "lonely", Target: "main"})

	assertLineChanges(t, got, []domain.LineChanges{
		{Path: "lonely.ts", Status: domain.ChangeAdded, Hunks: []domain.LineHunk{hunk(0, 0, 1, 1)}},
		{Path: "main.ts", Status: domain.ChangeDeleted, Hunks: []domain.LineHunk{hunk(1, 2, 0, 0)}},
	})
}

func TestChangedLinesOfGoneRefs(t *testing.T) {
	fixture := newGitFixture(t)
	fixture.write("app.ts", numbered(1))
	fixture.commitAll("base")
	fixture.run("branch", "feature")
	fixture.run("branch", "--delete", "--force", "feature")

	cases := []struct {
		name       string
		comparison domain.Comparison
	}{
		{name: "deleted source branch", comparison: domain.Comparison{Source: "feature", Target: "main"}},
		{name: "missing target branch", comparison: domain.Comparison{Source: "main", Target: "gone"}},
		{name: "missing target of uncommitted changes", comparison: domain.Comparison{Source: domain.UncommittedSource, Target: "gone"}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			files, err := fixture.repository().ChangedLines(t.Context(), c.comparison)
			if !errors.Is(err, domain.ErrUnknownBranch) {
				t.Fatalf("ChangedLines(%+v) error = %v, want %v", c.comparison, err, domain.ErrUnknownBranch)
			}
			if files != nil {
				t.Errorf("ChangedLines(%+v) files = %+v, want none", c.comparison, files)
			}
		})
	}
}

type gitFixture struct {
	t    *testing.T
	root string
}

func newGitFixture(t *testing.T) *gitFixture {
	t.Helper()
	t.Setenv("GIT_CONFIG_GLOBAL", os.DevNull)
	t.Setenv("GIT_CONFIG_NOSYSTEM", "1")
	fixture := &gitFixture{t: t, root: t.TempDir()}
	fixture.run("init", "--quiet", "--initial-branch=main")
	return fixture
}

func (f *gitFixture) repository() *Repository {
	return NewRepository(f.root, filepath.Join(f.root, ".git"))
}

func (f *gitFixture) run(args ...string) {
	f.t.Helper()
	settings := []string{"-c", "user.name=oversee", "-c", "user.email=oversee@example.com", "-c", "commit.gpgsign=false"}
	command := exec.CommandContext(f.t.Context(), "git", slices.Concat(settings, args)...)
	command.Dir = f.root
	if output, err := command.CombinedOutput(); err != nil {
		f.t.Fatalf("git %s: %v\n%s", strings.Join(args, " "), err, output)
	}
}

func (f *gitFixture) commitAll(message string) {
	f.t.Helper()
	f.run("add", "--all")
	f.run("commit", "--quiet", "--allow-empty", "--message", message)
}

func (f *gitFixture) write(path, content string) {
	f.t.Helper()
	absolute := f.absolute(path)
	if err := os.MkdirAll(filepath.Dir(absolute), 0o755); err != nil {
		f.t.Fatal(err)
	}
	if err := os.WriteFile(absolute, []byte(content), 0o644); err != nil {
		f.t.Fatal(err)
	}
}

func (f *gitFixture) remove(path string) {
	f.t.Helper()
	if err := os.Remove(f.absolute(path)); err != nil {
		f.t.Fatal(err)
	}
}

func (f *gitFixture) rename(from, to string) {
	f.t.Helper()
	if err := os.Rename(f.absolute(from), f.absolute(to)); err != nil {
		f.t.Fatal(err)
	}
}

func (f *gitFixture) chmod(path string, mode os.FileMode) {
	f.t.Helper()
	if err := os.Chmod(f.absolute(path), mode); err != nil {
		f.t.Fatal(err)
	}
}

func (f *gitFixture) absolute(path string) string {
	return filepath.Join(f.root, filepath.FromSlash(path))
}

func changedLinesOf(t *testing.T, fixture *gitFixture, comparison domain.Comparison) []domain.LineChanges {
	t.Helper()
	files, err := fixture.repository().ChangedLines(t.Context(), comparison)
	if err != nil {
		t.Fatalf("ChangedLines(%+v): %v", comparison, err)
	}
	return files
}

func numbered(numbers ...int) string {
	var text strings.Builder
	for _, number := range numbers {
		fmt.Fprintf(&text, "line %d\n", number)
	}
	return text.String()
}
