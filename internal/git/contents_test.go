package git

import (
	"bufio"
	"errors"
	"maps"
	"strings"
	"testing"

	"github.com/obsfx/oversee/internal/domain"
)

func blobStrings(blobs map[string]domain.Blob) map[string]string {
	result := make(map[string]string, len(blobs))
	for path, blob := range blobs {
		result[path] = string(blob)
	}
	return result
}

func TestContentsOf(t *testing.T) {
	fixture := newGitFixture(t)
	fixture.write("scripts/player.gd", "func old():\n\tpass\n")
	fixture.write("scenes/player.tscn", "[node name=\"Player\"]\n")
	fixture.write("icon.png", "\x00\x01\x02")
	fixture.commitAll("base")
	fixture.run("switch", "--quiet", "--create", "feature")
	fixture.write("scripts/player.gd", "func new():\n\tpass\n")
	fixture.write("scripts/enemy.gd", "func knock():\n\tpass\n")
	fixture.commitAll("feature work")
	fixture.write("scripts/player.gd", "func edited():\n\tpass\n")
	fixture.write("scripts/untracked.gd", "func draft():\n\tpass\n")
	fixture.remove("scenes/player.tscn")
	repository := fixture.repository()
	paths := []string{"scripts/player.gd", "scripts/enemy.gd", "scripts/untracked.gd", "scenes/player.tscn", "icon.png", "missing.gd"}

	cases := []struct {
		name       string
		comparison domain.Comparison
		side       domain.FileSide
		want       map[string]string
	}{
		{
			name:       "the new side of uncommitted changes is the working tree",
			comparison: domain.Comparison{Source: domain.UncommittedSource, Target: "main"},
			side:       domain.FileSideNew,
			want: map[string]string{
				"scripts/player.gd":    "func edited():\n\tpass\n",
				"scripts/enemy.gd":     "func knock():\n\tpass\n",
				"scripts/untracked.gd": "func draft():\n\tpass\n",
				"icon.png":             "\x00\x01\x02",
			},
		},
		{
			name:       "the old side of uncommitted changes is HEAD",
			comparison: domain.Comparison{Source: domain.UncommittedSource, Target: "main"},
			side:       domain.FileSideOld,
			want: map[string]string{
				"scripts/player.gd":  "func new():\n\tpass\n",
				"scripts/enemy.gd":   "func knock():\n\tpass\n",
				"scenes/player.tscn": "[node name=\"Player\"]\n",
				"icon.png":           "\x00\x01\x02",
			},
		},
		{
			name:       "the new side of a branch is its commit",
			comparison: domain.Comparison{Source: "feature", Target: "main"},
			side:       domain.FileSideNew,
			want: map[string]string{
				"scripts/player.gd":  "func new():\n\tpass\n",
				"scripts/enemy.gd":   "func knock():\n\tpass\n",
				"scenes/player.tscn": "[node name=\"Player\"]\n",
				"icon.png":           "\x00\x01\x02",
			},
		},
		{
			name:       "the old side of a branch is the merge base",
			comparison: domain.Comparison{Source: "feature", Target: "main"},
			side:       domain.FileSideOld,
			want: map[string]string{
				"scripts/player.gd":  "func old():\n\tpass\n",
				"scenes/player.tscn": "[node name=\"Player\"]\n",
				"icon.png":           "\x00\x01\x02",
			},
		},
	}
	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			blobs, err := repository.ContentsOf(t.Context(), testCase.comparison, testCase.side, paths, 1<<20)
			if err != nil {
				t.Fatalf("ContentsOf: %v", err)
			}
			if got := blobStrings(blobs); !maps.Equal(got, testCase.want) {
				t.Fatalf("contents\n got: %q\nwant: %q", got, testCase.want)
			}
		})
	}
}

func TestContentsOfNothing(t *testing.T) {
	fixture := newGitFixture(t)
	fixture.write("app.gd", "pass\n")
	fixture.commitAll("base")

	blobs, err := fixture.repository().ContentsOf(t.Context(), domain.Comparison{Source: "main", Target: "main"}, domain.FileSideNew, nil, 1<<20)

	if err != nil || len(blobs) != 0 {
		t.Fatalf("ContentsOf() = %v, %v, want an empty map", blobs, err)
	}
}

func TestContentsOfAGoneRef(t *testing.T) {
	fixture := newGitFixture(t)
	fixture.write("app.gd", "pass\n")
	fixture.commitAll("base")

	_, err := fixture.repository().ContentsOf(t.Context(), domain.Comparison{Source: "gone", Target: "main"}, domain.FileSideNew, []string{"app.gd"}, 1<<20)

	if !errors.Is(err, domain.ErrUnknownBranch) {
		t.Fatalf("ContentsOf error = %v, want ErrUnknownBranch", err)
	}
}

func TestCatFileOutputBlobs(t *testing.T) {
	output := catFileOutput{reader: bufio.NewReader(strings.NewReader("aaaa blob 6\nline1\n\n" + "main:missing.gd missing\n" + "bbbb tree 3\nxyz\n" + "cccc blob 0\n\n"))}

	blobs := output.Blobs([]string{"first.gd", "missing.gd", "folder", "empty.gd"}, 1<<20)

	want := map[string]string{"first.gd": "line1\n", "empty.gd": ""}
	if got := blobStrings(blobs); !maps.Equal(got, want) {
		t.Fatalf("blobs = %q, want %q", got, want)
	}
}
