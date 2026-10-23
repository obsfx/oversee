package gdscript

import (
	"strings"
	"testing"

	"github.com/obsfx/oversee/internal/gdscript/grammar"
)

func TestNotices(t *testing.T) {
	want := []struct {
		project string
		version string
	}{
		{project: "tree-sitter/tree-sitter", version: grammar.TreeSitterVersion},
		{project: "PrestonKnopp/tree-sitter-gdscript", version: grammar.GrammarCommit},
	}

	notices := Notices()

	if len(notices) != len(want) {
		t.Fatalf("Notices = %d notices, want %d", len(notices), len(want))
	}
	for index, notice := range notices {
		if notice.Project != want[index].project || notice.Version != want[index].version {
			t.Errorf("notice %d = %s %s, want %s %s", index, notice.Project, notice.Version, want[index].project, want[index].version)
		}
		if notice.Version == "" {
			t.Errorf("%s has no version", notice.Project)
		}
		if !strings.Contains(notice.License, "MIT") {
			t.Errorf("%s license does not contain MIT: %q", notice.Project, notice.License)
		}
	}
}
