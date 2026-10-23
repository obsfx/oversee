package notices

import (
	"runtime"
	"strings"
	"testing"
)

func TestNoticeText(t *testing.T) {
	notice := Notice{Project: "msuozzo/bonsai", Version: "v0.4.1", License: "MIT License\n\nCopyright\n"}

	if got, want := notice.Text(), "msuozzo/bonsai v0.4.1\n\nMIT License\n\nCopyright\n"; got != want {
		t.Errorf("Text = %q, want %q", got, want)
	}
}

func TestModuleNoticeJoinsLicenses(t *testing.T) {
	module := Module{
		Path:     "golang.org/x/sys",
		Version:  "v0.48.0",
		Licenses: []License{{File: "LICENSE", Text: "BSD\n"}, {File: "PATENTS", Text: "grant\n"}},
	}

	got := module.Notice()

	want := Notice{Project: "golang.org/x/sys", Version: "v0.48.0", License: "BSD\n\ngrant\n"}
	if got != want {
		t.Errorf("Notice = %#v, want %#v", got, want)
	}
}

func TestModulesAreEmbedded(t *testing.T) {
	modules, err := Modules()
	if err != nil {
		t.Fatalf("Modules: %v", err)
	}

	if len(modules) == 0 {
		t.Fatal("Modules returned no modules")
	}
	for index, module := range modules {
		if module.Path == "" || module.Version == "" {
			t.Errorf("module %d has no path or version: %#v", index, module)
		}
		if index > 0 && modules[index-1].Path >= module.Path {
			t.Errorf("%s is not sorted after %s", module.Path, modules[index-1].Path)
		}
		if len(module.Licenses) == 0 {
			t.Errorf("%s has no license", module.Path)
		}
		for _, license := range module.Licenses {
			if license.File == "" || strings.TrimSpace(license.Text) == "" || !strings.HasSuffix(license.Text, "\n") {
				t.Errorf("%s has an empty or unterminated license %q", module.Path, license.File)
			}
		}
	}
}

func TestCompiledStartsWithGoThenModules(t *testing.T) {
	compiled, err := Compiled()
	if err != nil {
		t.Fatalf("Compiled: %v", err)
	}
	modules, err := Modules()
	if err != nil {
		t.Fatalf("Modules: %v", err)
	}

	if len(compiled) != len(modules)+1 {
		t.Fatalf("Compiled = %d notices, want Go and %d modules", len(compiled), len(modules))
	}
	goNotice := compiled[0]
	if goNotice.Project != "go" || goNotice.Version != runtime.Version() {
		t.Errorf("first notice = %s %s, want go %s", goNotice.Project, goNotice.Version, runtime.Version())
	}
	for _, part := range []string{"Copyright 2009 The Go Authors", "Additional IP Rights Grant (Patents)"} {
		if !strings.Contains(goNotice.License, part) {
			t.Errorf("Go notice does not contain %q", part)
		}
	}
	for index, module := range modules {
		if compiled[index+1] != module.Notice() {
			t.Errorf("notice %d = %s, want %s", index+1, compiled[index+1].Project, module.Path)
		}
	}
}
