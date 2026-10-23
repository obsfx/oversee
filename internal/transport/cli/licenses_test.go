package cli

import (
	"bytes"
	"io"
	"runtime"
	"strings"
	"testing"

	"github.com/obsfx/oversee/internal/gdscript/grammar"
	"github.com/obsfx/oversee/internal/notices"
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
	expected := []struct {
		header  string
		license string
	}{
		{header: "github.com/msuozzo/bonsai " + grammar.BonsaiVersion, license: grammar.LicenseBonsai},
		{header: "tree-sitter/tree-sitter " + grammar.TreeSitterVersion, license: grammar.LicenseTreeSitter},
		{header: "PrestonKnopp/tree-sitter-gdscript " + grammar.GrammarCommit, license: grammar.LicenseGrammar},
	}

	out, err := runLicenses(t, []string{})
	if err != nil {
		t.Fatalf("licenses: %v", err)
	}

	previous := -1
	for _, notice := range expected {
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

func TestLicensesPrintsGoThenEveryModule(t *testing.T) {
	modules, err := notices.Modules()
	if err != nil {
		t.Fatalf("Modules: %v", err)
	}

	out, err := runLicenses(t, []string{})
	if err != nil {
		t.Fatalf("licenses: %v", err)
	}

	if !strings.HasPrefix(out, "go "+runtime.Version()+"\n\nCopyright 2009 The Go Authors") {
		t.Errorf("output does not start with the Go notice:\n%.200s", out)
	}
	previous := 0
	paths := map[string]bool{}
	for _, module := range modules {
		text := module.Notice().Text()
		index := strings.Index(out, "\n"+text)
		if index < 0 {
			t.Fatalf("output has no line starting %q followed by its licenses", module.Path+" "+module.Version)
		}
		if index <= previous {
			t.Errorf("%s is printed out of order", module.Path)
		}
		previous = index
		paths[module.Path] = true
	}
	if parser := strings.Index(out, "\ntree-sitter/tree-sitter "); parser <= previous {
		t.Errorf("the GDScript parser notices are not printed after the modules")
	}
	for _, path := range []string{"github.com/spf13/cobra", "modernc.org/sqlite", "github.com/coder/websocket"} {
		if !paths[path] {
			t.Errorf("no notice for %s", path)
		}
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
