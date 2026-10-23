package git

import (
	"cmp"
	"slices"
	"strings"
	"testing"

	"github.com/obsfx/oversee/internal/domain"
)

func TestPatchOutputFiles(t *testing.T) {
	cases := []struct {
		name  string
		patch string
		want  []domain.LineChanges
	}{
		{
			name: "zero length hunks on either side",
			patch: patchOf(
				"diff --git a/app.ts b/app.ts",
				"index 1111111..2222222 100644",
				"--- a/app.ts",
				"+++ b/app.ts",
				"@@ -5,2 +4,0 @@",
				"-five",
				"-six",
				"@@ -9,0 +8,2 @@ function render() {",
				"+nine",
				"+ten",
			),
			want: []domain.LineChanges{
				{Path: "app.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(5, 2, 4, 0), hunk(9, 0, 8, 2)}},
			},
		},
		{
			name: "hunks without counts span one line",
			patch: patchOf(
				"diff --git a/app.ts b/app.ts",
				"--- a/app.ts",
				"+++ b/app.ts",
				"@@ -3 +3 @@",
				"-three",
				"+THREE",
				"@@ -7 +6,0 @@",
				"-seven",
				"@@ -9,0 +9 @@",
				"+nine",
			),
			want: []domain.LineChanges{
				{Path: "app.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(3, 1, 3, 1), hunk(7, 1, 6, 0), hunk(9, 0, 9, 1)}},
			},
		},
		{
			name: "new file",
			patch: patchOf(
				"diff --git a/new.ts b/new.ts",
				"new file mode 100644",
				"index 0000000..1111111",
				"--- /dev/null",
				"+++ b/new.ts",
				"@@ -0,0 +1,2 @@",
				"+one",
				"+two",
			),
			want: []domain.LineChanges{
				{Path: "new.ts", Status: domain.ChangeAdded, Hunks: []domain.LineHunk{hunk(0, 0, 1, 2)}},
			},
		},
		{
			name: "deleted file keeps its old path",
			patch: patchOf(
				"diff --git a/old.ts b/old.ts",
				"deleted file mode 100644",
				"index 1111111..0000000",
				"--- a/old.ts",
				"+++ /dev/null",
				"@@ -1,3 +0,0 @@",
				"-one",
				"-two",
				"-three",
			),
			want: []domain.LineChanges{
				{Path: "old.ts", Status: domain.ChangeDeleted, Hunks: []domain.LineHunk{hunk(1, 3, 0, 0)}},
			},
		},
		{
			name: "renamed file with changes keeps the previous path",
			patch: patchOf(
				"diff --git a/src/old.ts b/src/new.ts",
				"similarity index 90%",
				"rename from src/old.ts",
				"rename to src/new.ts",
				"index 1111111..2222222 100644",
				"--- a/src/old.ts",
				"+++ b/src/new.ts",
				"@@ -4 +4 @@",
				"-four",
				"+FOUR",
			),
			want: []domain.LineChanges{
				{Path: "src/new.ts", PreviousPath: "src/old.ts", Status: domain.ChangeRenamed, Hunks: []domain.LineHunk{hunk(4, 1, 4, 1)}},
			},
		},
		{
			name: "entries without hunks are left out",
			patch: patchOf(
				"diff --git a/old.ts b/new.ts",
				"similarity index 100%",
				"rename from old.ts",
				"rename to new.ts",
				"diff --git a/empty.ts b/empty.ts",
				"new file mode 100644",
				"index 0000000..e69de29",
				"diff --git a/icon.png b/icon.png",
				"new file mode 100644",
				"index 0000000..1111111",
				"Binary files /dev/null and b/icon.png differ",
				"diff --git a/logo.png b/logo.png",
				"index 1111111..2222222 100644",
				"Binary files a/logo.png and b/logo.png differ",
				"diff --git a/old.png b/old.png",
				"deleted file mode 100644",
				"index 1111111..0000000",
				"Binary files a/old.png and /dev/null differ",
				"diff --git a/run.sh b/run.sh",
				"old mode 100644",
				"new mode 100755",
				"diff --git a/app.ts b/app.ts",
				"--- a/app.ts",
				"+++ b/app.ts",
				"@@ -1 +1 @@",
			),
			want: []domain.LineChanges{
				{Path: "app.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(1, 1, 1, 1)}},
			},
		},
		{
			name: "missing newline markers are not hunks",
			patch: patchOf(
				"diff --git a/app.ts b/app.ts",
				"--- a/app.ts",
				"+++ b/app.ts",
				"@@ -2 +2 @@ first",
				"-second",
				`\ No newline at end of file`,
				"+changed",
				`\ No newline at end of file`,
			),
			want: []domain.LineChanges{
				{Path: "app.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(2, 1, 2, 1)}},
			},
		},
		{
			name: "hunk lines that look like headers stay content",
			patch: patchOf(
				"diff --git a/real.ts b/real.ts",
				"--- a/real.ts",
				"+++ b/real.ts",
				"@@ -2 +2 @@",
				"--- a/fake.ts",
				"+++ b/fake.ts",
				"@@ -4,0 +5 @@",
				"+@@ -1 +1 @@",
			),
			want: []domain.LineChanges{
				{Path: "real.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(2, 1, 2, 1), hunk(4, 0, 5, 1)}},
			},
		},
		{
			name: "paths with spaces end with a tab",
			patch: patchOf(
				"diff --git a/my notes.ts b/my notes.ts",
				"--- a/my notes.ts\t",
				"+++ b/my notes.ts\t",
				"@@ -1 +1 @@",
				"-one",
				"+ONE",
			),
			want: []domain.LineChanges{
				{Path: "my notes.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(1, 1, 1, 1)}},
			},
		},
		{
			name: "unicode paths without quoting",
			patch: patchOf(
				"diff --git a/café.ts b/café.ts",
				"--- a/café.ts",
				"+++ b/café.ts",
				"@@ -1 +1 @@",
			),
			want: []domain.LineChanges{
				{Path: "café.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(1, 1, 1, 1)}},
			},
		},
		{
			name: "quoted paths are unquoted",
			patch: patchOf(
				`diff --git "a/quo\"te.ts" "b/quo\"te.ts"`,
				`--- "a/quo\"te.ts"`,
				`+++ "b/quo\"te.ts"`,
				"@@ -1 +1 @@",
				`diff --git "a/caf\303\251 menu.ts" "b/caf\303\251 menu.ts"`,
				`--- "a/caf\303\251 menu.ts"`+"\t",
				`+++ "b/caf\303\251 menu.ts"`+"\t",
				"@@ -2 +2 @@",
				`diff --git "a/tab\there.ts" "b/tab\there.ts"`,
				`--- "a/tab\there.ts"`,
				`+++ "b/tab\there.ts"`,
				"@@ -3 +3 @@",
			),
			want: []domain.LineChanges{
				{Path: "café menu.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(2, 1, 2, 1)}},
				{Path: `quo"te.ts`, Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(1, 1, 1, 1)}},
				{Path: "tab\there.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(3, 1, 3, 1)}},
			},
		},
		{
			name: "quoted rename source is unquoted",
			patch: patchOf(
				`diff --git "a/old \"name\".ts" b/new.ts`,
				"similarity index 80%",
				`rename from "old \"name\".ts"`,
				"rename to new.ts",
				`--- "a/old \"name\".ts"`,
				"+++ b/new.ts",
				"@@ -1 +1 @@",
			),
			want: []domain.LineChanges{
				{Path: "new.ts", PreviousPath: `old "name".ts`, Status: domain.ChangeRenamed, Hunks: []domain.LineHunk{hunk(1, 1, 1, 1)}},
			},
		},
		{
			name: "path prefixes are trimmed once",
			patch: patchOf(
				"diff --git a/a/b.ts b/a/b.ts",
				"--- a/a/b.ts",
				"+++ b/a/b.ts",
				"@@ -1 +1 @@",
			),
			want: []domain.LineChanges{
				{Path: "a/b.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(1, 1, 1, 1)}},
			},
		},
		{
			name: "several files keep their own hunks",
			patch: patchOf(
				"diff --git a/first.ts b/first.ts",
				"--- a/first.ts",
				"+++ b/first.ts",
				"@@ -1 +1 @@",
				"diff --git a/second.ts b/second.ts",
				"--- a/second.ts",
				"+++ b/second.ts",
				"@@ -8,2 +8,3 @@",
			),
			want: []domain.LineChanges{
				{Path: "first.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(1, 1, 1, 1)}},
				{Path: "second.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(8, 2, 8, 3)}},
			},
		},
		{
			name: "text before the first file is ignored",
			patch: patchOf(
				"warning: something happened",
				"@@ -1 +1 @@",
				"diff --git a/app.ts b/app.ts",
				"--- a/app.ts",
				"+++ b/app.ts",
				"@@ -4 +4 @@",
			),
			want: []domain.LineChanges{
				{Path: "app.ts", Status: domain.ChangeModified, Hunks: []domain.LineHunk{hunk(4, 1, 4, 1)}},
			},
		},
		{
			name:  "empty patch",
			patch: "",
			want:  nil,
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			assertLineChanges(t, patchOutput(c.patch).Files(), c.want)
		})
	}
}

func patchOf(lines ...string) string {
	return strings.Join(lines, "\n") + "\n"
}

func hunk(oldStart, oldLines, newStart, newLines int) domain.LineHunk {
	return domain.LineHunk{OldStart: oldStart, OldLines: oldLines, NewStart: newStart, NewLines: newLines}
}

func assertLineChanges(t *testing.T, got, want []domain.LineChanges) {
	t.Helper()
	byPath := slices.SortedFunc(slices.Values(got), func(left, right domain.LineChanges) int {
		return cmp.Compare(left.Path, right.Path)
	})
	if !slices.EqualFunc(byPath, want, sameLineChanges) {
		t.Errorf("line changes\n got: %+v\nwant: %+v", byPath, want)
	}
}

func sameLineChanges(left, right domain.LineChanges) bool {
	return left.Path == right.Path &&
		left.PreviousPath == right.PreviousPath &&
		left.Status == right.Status &&
		slices.Equal(left.Hunks, right.Hunks)
}
