package noticesgen

import (
	"encoding/json/v2"
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"github.com/obsfx/oversee/internal/notices"
)

const repoDir = "../.."

func writeFiles(t *testing.T, dir string, files map[string]string) {
	t.Helper()
	for name, content := range files {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}
}

func TestLicenseFile(t *testing.T) {
	cases := []struct {
		name string
		want bool
	}{
		{name: "LICENSE", want: true},
		{name: "LICENSE.txt", want: true},
		{name: "license.md", want: true},
		{name: "LICENCE", want: true},
		{name: "LICENSE-3RD-PARTY.md", want: true},
		{name: "LICENSE-SQLITE_VEC", want: true},
		{name: "COPYING", want: true},
		{name: "NOTICE", want: true},
		{name: "PATENTS", want: true},
		{name: "licenses_test.go", want: false},
		{name: "LICENSES", want: false},
		{name: "README.md", want: false},
		{name: "unlicensed", want: false},
		{name: "notices.txt", want: false},
	}
	for _, tc := range cases {
		if got := licenseFile.MatchString(tc.name); got != tc.want {
			t.Errorf("licenseFile.MatchString(%q) = %v, want %v", tc.name, got, tc.want)
		}
	}
}

func TestReadLicenses(t *testing.T) {
	dir := t.TempDir()
	writeFiles(t, dir, map[string]string{
		"PATENTS":     "patent grant",
		"LICENSE.txt": "MIT License\n\nCopyright\n\n\n",
		"COPYING":     "copying\n",
		"LICENSE.go":  "package license\n",
		"README.md":   "readme\n",
		"main.go":     "package main\n",
	})
	if err := os.Mkdir(filepath.Join(dir, "NOTICE"), 0o755); err != nil {
		t.Fatal(err)
	}

	licenses, err := readLicenses(dir)
	if err != nil {
		t.Fatalf("readLicenses: %v", err)
	}

	want := []notices.License{
		{File: "COPYING", Text: "copying\n"},
		{File: "LICENSE.txt", Text: "MIT License\n\nCopyright\n"},
		{File: "PATENTS", Text: "patent grant\n"},
	}
	if !reflect.DeepEqual(licenses, want) {
		t.Errorf("readLicenses = %#v, want %#v", licenses, want)
	}
}

func TestReadLicensesFailsWithoutLicense(t *testing.T) {
	dir := t.TempDir()
	writeFiles(t, dir, map[string]string{"README.md": "readme\n", "LICENSE.go": "package license\n"})

	if _, err := readLicenses(dir); err == nil || !strings.Contains(err.Error(), "no license file") {
		t.Errorf("readLicenses error = %v, want a missing license error", err)
	}
}

func TestReadLicensesFailsForMissingDirectory(t *testing.T) {
	_, err := readLicenses(filepath.Join(t.TempDir(), "missing"))

	if !errors.Is(err, os.ErrNotExist) {
		t.Errorf("readLicenses error = %v, want os.ErrNotExist", err)
	}
}

func TestAddModules(t *testing.T) {
	listed := map[string]listedModule{
		"github.com/spf13/cobra": {path: "github.com/spf13/cobra", version: "v1.10.1", dir: "/old"},
	}
	output := "\n" +
		"github.com/spf13/cobra\tv1.10.2\t/mod/github.com/spf13/cobra@v1.10.2\n" +
		"\n" +
		"modernc.org/sqlite\tv1.60.1\t/mod/modernc.org/sqlite@v1.60.1\n"

	if err := addModules(output, listed); err != nil {
		t.Fatalf("addModules: %v", err)
	}

	want := map[string]listedModule{
		"github.com/spf13/cobra": {path: "github.com/spf13/cobra", version: "v1.10.2", dir: "/mod/github.com/spf13/cobra@v1.10.2"},
		"modernc.org/sqlite":     {path: "modernc.org/sqlite", version: "v1.60.1", dir: "/mod/modernc.org/sqlite@v1.60.1"},
	}
	if !reflect.DeepEqual(listed, want) {
		t.Errorf("listed = %#v, want %#v", listed, want)
	}
}

func TestAddModulesRejectsUnexpectedLines(t *testing.T) {
	for _, output := range []string{
		"github.com/spf13/cobra v1.10.2 /mod/cobra\n",
		"github.com/spf13/cobra\tv1.10.2\t\n",
		"github.com/spf13/cobra\tv1.10.2\t/mod/cobra\textra\n",
	} {
		if err := addModules(output, map[string]listedModule{}); err == nil {
			t.Errorf("addModules(%q) succeeded, want an error", output)
		}
	}
}

func TestEncodeRoundTrips(t *testing.T) {
	modules := []notices.Module{
		{Path: "github.com/spf13/cobra", Version: "v1.10.2", Licenses: []notices.License{{File: "LICENSE.txt", Text: "Apache License\n"}}},
		{Path: "golang.org/x/sys", Version: "v0.48.0", Licenses: []notices.License{{File: "LICENSE", Text: "BSD\n"}, {File: "PATENTS", Text: "grant\n"}}},
	}

	content, err := Encode(modules)
	if err != nil {
		t.Fatalf("Encode: %v", err)
	}

	if !strings.HasSuffix(string(content), "]\n") {
		t.Errorf("Encode output does not end with a newline: %q", content)
	}
	if !strings.Contains(string(content), "\n  {\n    \"path\": \"github.com/spf13/cobra\"") {
		t.Errorf("Encode output is not indented with two spaces:\n%s", content)
	}
	var decoded []notices.Module
	if err := json.Unmarshal(content, &decoded); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if !reflect.DeepEqual(decoded, modules) {
		t.Errorf("decoded = %#v, want %#v", decoded, modules)
	}
	again, err := Encode(modules)
	if err != nil || string(again) != string(content) {
		t.Errorf("Encode is not deterministic: %v\n%s\n%s", err, content, again)
	}
}

func TestCheck(t *testing.T) {
	path := filepath.Join(t.TempDir(), "modules.json")
	writeFiles(t, filepath.Dir(path), map[string]string{"modules.json": "[]\n"})

	if err := Check(path, []byte("[]\n")); err != nil {
		t.Errorf("Check of the same content = %v, want nil", err)
	}
	if err := Check(path, []byte("[{}]\n")); err == nil || !strings.Contains(err.Error(), "out of date, run pnpm generate:notices") {
		t.Errorf("Check of other content = %v, want an out of date error", err)
	}
	if err := Check(filepath.Join(t.TempDir(), "missing.json"), []byte("[]\n")); !errors.Is(err, os.ErrNotExist) {
		t.Errorf("Check of a missing file = %v, want os.ErrNotExist", err)
	}
}

func TestEmbeddedModulesAreCurrent(t *testing.T) {
	if testing.Short() {
		t.Skip("runs go list for every release target")
	}

	modules, err := Collect(t.Context(), repoDir)
	if err != nil {
		t.Fatalf("Collect: %v", err)
	}
	content, err := Encode(modules)
	if err != nil {
		t.Fatalf("Encode: %v", err)
	}

	if err := Check(filepath.Join(repoDir, "internal", "notices", "modules.json"), content); err != nil {
		t.Error(err)
	}
}
