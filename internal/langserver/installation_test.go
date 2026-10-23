package langserver

import (
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/obsfx/oversee/internal/catalog"
)

var installedAt = time.Date(2026, 10, 1, 12, 0, 0, 0, time.UTC)

func installFixture(t *testing.T, home Home, id, version string, at time.Time) Installation {
	t.Helper()
	installation := Installation{
		ID:          id,
		Version:     version,
		Platform:    catalog.PlatformDarwinArm64,
		InstalledAt: at,
		Bin:         catalog.Bin{Kind: catalog.BinGolang, Path: id},
		Dir:         home.InstallDir(id, version),
	}
	if err := os.MkdirAll(installation.Dir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := writeManifest(installation); err != nil {
		t.Fatal(err)
	}
	return installation
}

func mkdirs(t *testing.T, dirs ...string) {
	t.Helper()
	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			t.Fatal(err)
		}
	}
}

func writeText(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}

func dirNames(t *testing.T, dir string) []string {
	t.Helper()
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		names = append(names, entry.Name())
	}
	return names
}

func TestInstallationsFind(t *testing.T) {
	t.Run("a server that was never installed", func(t *testing.T) {
		installations := NewInstallations(Home{root: t.TempDir()})
		_, found, err := installations.Find("gopls")
		if err != nil || found {
			t.Fatalf("Find = found %t, err %v, want not found without an error", found, err)
		}
	})
	t.Run("the most recent install wins and broken versions are skipped", func(t *testing.T) {
		home := Home{root: t.TempDir()}
		installFixture(t, home, "gopls", "0.20.0", installedAt)
		want := installFixture(t, home, "gopls", "0.19.0", installedAt.Add(time.Hour))
		mkdirs(t, home.InstallDir("gopls", "partial"))
		writeText(t, filepath.Join(home.InstallDir("gopls", "broken"), manifestName), "{not json")
		writeText(t, filepath.Join(home.ServerDir("gopls"), "notes.txt"), "not a version")
		got, found, err := NewInstallations(home).Find("gopls")
		if err != nil || !found {
			t.Fatalf("Find = found %t, err %v, want an installation", found, err)
		}
		if got.Version != want.Version || got.Dir != want.Dir || !got.InstalledAt.Equal(want.InstalledAt) || got.Bin != want.Bin || got.Platform != want.Platform || got.ID != want.ID {
			t.Errorf("Find = %+v, want %+v", got, want)
		}
	})
	t.Run("only broken versions", func(t *testing.T) {
		home := Home{root: t.TempDir()}
		mkdirs(t, home.InstallDir("gopls", "partial"))
		writeText(t, filepath.Join(home.InstallDir("gopls", "broken"), manifestName), "[]")
		_, found, err := NewInstallations(home).Find("gopls")
		if err != nil || found {
			t.Fatalf("Find = found %t, err %v, want not found without an error", found, err)
		}
	})
	t.Run("an unreadable server directory is an error", func(t *testing.T) {
		home := Home{root: t.TempDir()}
		writeText(t, home.ServerDir("gopls"), "a file where the directory belongs")
		if _, _, err := NewInstallations(home).Find("gopls"); err == nil {
			t.Fatal("Find returned no error for a server path that is a file")
		}
	})
}

func TestInstallationsInstalledVersion(t *testing.T) {
	home := Home{root: t.TempDir()}
	installations := NewInstallations(home)
	version, err := installations.InstalledVersion("gopls")
	if err != nil || version != "" {
		t.Fatalf("InstalledVersion before install = %q, %v, want empty", version, err)
	}
	installFixture(t, home, "gopls", "0.20.0", installedAt)
	version, err = installations.InstalledVersion("gopls")
	if err != nil || version != "0.20.0" {
		t.Fatalf("InstalledVersion = %q, %v, want 0.20.0", version, err)
	}
}

func TestInstallationsKeepOnly(t *testing.T) {
	t.Run("removes every other version", func(t *testing.T) {
		home := Home{root: t.TempDir()}
		installFixture(t, home, "gopls", "0.19.0", installedAt)
		installFixture(t, home, "gopls", "0.20.0", installedAt)
		mkdirs(t, home.InstallDir("gopls", "partial"))
		writeText(t, filepath.Join(home.ServerDir("gopls"), "stray.txt"), "stray")
		installFixture(t, home, "pyright", "1.1.0", installedAt)
		if err := NewInstallations(home).KeepOnly("gopls", "0.20.0"); err != nil {
			t.Fatal(err)
		}
		if names := dirNames(t, home.ServerDir("gopls")); !slices.Equal(names, []string{"0.20.0"}) {
			t.Errorf("gopls keeps %v, want [0.20.0]", names)
		}
		if names := dirNames(t, home.ServerDir("pyright")); !slices.Equal(names, []string{"1.1.0"}) {
			t.Errorf("pyright keeps %v, want it untouched", names)
		}
	})
	t.Run("keeps a version whose directory name was escaped", func(t *testing.T) {
		home := Home{root: t.TempDir()}
		installFixture(t, home, "jdtls", "release/1.40", installedAt)
		installFixture(t, home, "jdtls", "1.39", installedAt)
		if err := NewInstallations(home).KeepOnly("jdtls", "release/1.40"); err != nil {
			t.Fatal(err)
		}
		if names := dirNames(t, home.ServerDir("jdtls")); !slices.Equal(names, []string{"release_1.40"}) {
			t.Errorf("jdtls keeps %v, want [release_1.40]", names)
		}
	})
	t.Run("a server that was never installed", func(t *testing.T) {
		if err := NewInstallations(Home{root: t.TempDir()}).KeepOnly("gopls", "0.20.0"); err != nil {
			t.Fatalf("KeepOnly = %v, want nil", err)
		}
	})
}

func TestInstallationsRemove(t *testing.T) {
	home := Home{root: t.TempDir()}
	installFixture(t, home, "jdtls", "1.40", installedAt)
	installFixture(t, home, "pyright", "1.1.0", installedAt)
	jdtlsData := home.DataDir("jdtls", "/repo")
	pyrightData := home.DataDir("pyright", "/repo")
	mkdirs(t, jdtlsData, pyrightData)
	installations := NewInstallations(home)
	if err := installations.Remove("jdtls"); err != nil {
		t.Fatal(err)
	}
	requireMissing(t, home.ServerDir("jdtls"))
	requireMissing(t, filepath.Dir(jdtlsData))
	if _, found, err := installations.Find("pyright"); err != nil || !found {
		t.Errorf("pyright Find = found %t, err %v, want it kept", found, err)
	}
	if _, err := os.Stat(pyrightData); err != nil {
		t.Errorf("pyright data: %v, want it kept", err)
	}
	if err := installations.Remove("jdtls"); err != nil {
		t.Errorf("second Remove = %v, want nil", err)
	}
}

func TestInstallationCommand(t *testing.T) {
	skipWithoutUnixModes(t)
	tools := fakeToolPath(t, "node", "python3", "java", "dotnet")
	dir := filepath.Join(t.TempDir(), "server")
	tests := []struct {
		name        string
		bin         catalog.Bin
		wantProgram string
		wantArgs    []string
	}{
		{name: "exec", bin: catalog.Bin{Kind: catalog.BinExec, Path: "bin/zls"}, wantProgram: filepath.Join(dir, "bin", "zls")},
		{name: "npm", bin: catalog.Bin{Kind: catalog.BinNpm, Path: "typescript-language-server"}, wantProgram: filepath.Join(dir, "node_modules", ".bin", "typescript-language-server")},
		{name: "golang", bin: catalog.Bin{Kind: catalog.BinGolang, Path: "gopls"}, wantProgram: filepath.Join(dir, "bin", "gopls")},
		{name: "node", bin: catalog.Bin{Kind: catalog.BinNode, Path: "dist/server.js"}, wantProgram: filepath.Join(tools, "node"), wantArgs: []string{filepath.Join(dir, "dist", "server.js")}},
		{name: "python", bin: catalog.Bin{Kind: catalog.BinPython, Path: "server.py"}, wantProgram: filepath.Join(tools, "python3"), wantArgs: []string{filepath.Join(dir, "server.py")}},
		{name: "java-jar", bin: catalog.Bin{Kind: catalog.BinJava, Path: "plugins/launcher.jar"}, wantProgram: filepath.Join(tools, "java"), wantArgs: []string{"-jar", filepath.Join(dir, "plugins", "launcher.jar")}},
		{name: "dotnet", bin: catalog.Bin{Kind: catalog.BinDotnet, Path: "OmniSharp.dll"}, wantProgram: filepath.Join(tools, "dotnet"), wantArgs: []string{filepath.Join(dir, "OmniSharp.dll")}},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			installation := Installation{ID: "server", Bin: test.bin, Dir: dir}
			program, args, err := installation.Command(NewToolchain())
			if err != nil {
				t.Fatal(err)
			}
			if program != test.wantProgram || !slices.Equal(args, test.wantArgs) {
				t.Errorf("Command = %s %q, want %s %q", program, args, test.wantProgram, test.wantArgs)
			}
		})
	}
}

func TestInstallationCommandWithoutItsRunner(t *testing.T) {
	skipWithoutUnixModes(t)
	fakeToolPath(t)
	tests := []struct {
		kind catalog.BinKind
		tool string
	}{
		{kind: catalog.BinNode, tool: "node"},
		{kind: catalog.BinPython, tool: "python3"},
		{kind: catalog.BinJava, tool: "java"},
		{kind: catalog.BinDotnet, tool: "dotnet"},
	}
	for _, test := range tests {
		t.Run(string(test.kind), func(t *testing.T) {
			installation := Installation{ID: "server", Bin: catalog.Bin{Kind: test.kind, Path: "server"}, Dir: t.TempDir()}
			_, _, err := installation.Command(NewToolchain())
			if err == nil || !strings.Contains(err.Error(), test.tool+" is not on PATH") {
				t.Fatalf("Command error = %v, want %s is not on PATH", err, test.tool)
			}
		})
	}
}
