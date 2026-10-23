package cli

import (
	"bytes"
	"io"
	"strings"
	"testing"

	"github.com/obsfx/oversee/internal/gdscript/grammar"
)

func runLicenses(t *testing.T, args []string) (string, error) {
	t.Helper()
	var out bytes.Buffer
	command := licensesCommand()
	command.SetOut(&out)
	command.SetErr(io.Discard)
	command.SetArgs(args)
	command.SilenceUsage = true
	command.SilenceErrors = true
	err := command.ExecuteContext(t.Context())
	return out.String(), err
}

func TestLicensesPrintsEveryNotice(t *testing.T) {
	notices := []struct {
		header  string
		license string
	}{
		{header: "tree-sitter/tree-sitter " + grammar.TreeSitterVersion, license: grammar.LicenseTreeSitter},
		{header: "PrestonKnopp/tree-sitter-gdscript " + grammar.GrammarCommit, license: grammar.LicenseGrammar},
		{header: "msuozzo/bonsai " + grammar.BonsaiVersion, license: grammar.LicenseBonsai},
	}

	out, err := runLicenses(t, []string{})
	if err != nil {
		t.Fatalf("licenses: %v", err)
	}

	previous := -1
	for _, notice := range notices {
		if !strings.Contains(notice.license, "MIT") {
			t.Fatalf("%s license does not contain MIT", notice.header)
		}
		index := strings.Index(out, notice.header+"\n\n"+notice.license)
		if index < 0 {
			t.Fatalf("output has no %q followed by its license\n%s", notice.header, out)
		}
		if index > 0 && out[index-1] != '\n' {
			t.Errorf("%q does not start its own line", notice.header)
		}
		if index <= previous {
			t.Errorf("%q is printed out of order", notice.header)
		}
		previous = index
	}
}

func TestLicensesRejectsArguments(t *testing.T) {
	out, err := runLicenses(t, []string{"bonsai"})

	if err == nil {
		t.Fatal("licenses bonsai succeeded, want an argument error")
	}
	if out != "" {
		t.Errorf("output = %q, want nothing printed", out)
	}
}
