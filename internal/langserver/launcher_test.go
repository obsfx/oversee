package langserver

import (
	"context"
	"io"
	"maps"
	"os"
	"path/filepath"
	"reflect"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/obsfx/oversee/internal/catalog"
)

func echoInstallation(t *testing.T, script string) Installation {
	t.Helper()
	dir := t.TempDir()
	writeExecutable(t, filepath.Join(dir, "bin"), "server", shellScript(script))
	return Installation{ID: "jdtls", Version: "1.40", Bin: catalog.Bin{Kind: catalog.BinExec, Path: "bin/server"}, Dir: dir}
}

func waitDone(t *testing.T, process *Process) {
	t.Helper()
	select {
	case <-process.Done():
	case <-time.After(10 * time.Second):
		t.Fatal("the process did not exit")
	}
}

func outputLines(t *testing.T, process *Process) []string {
	t.Helper()
	output, err := io.ReadAll(process)
	if err != nil {
		t.Fatal(err)
	}
	waitDone(t, process)
	return strings.Split(strings.TrimSuffix(string(output), "\n"), "\n")
}

func realPath(t *testing.T, path string) string {
	t.Helper()
	resolved, err := filepath.EvalSymlinks(path)
	if err != nil {
		t.Fatal(err)
	}
	return resolved
}

func TestLauncherStartResolvesTheDataDir(t *testing.T) {
	skipWithoutUnixModes(t)
	fakeToolPath(t)
	home := Home{root: t.TempDir()}
	root := t.TempDir()
	dataDir := home.DataDir("jdtls", root)
	installation := echoInstallation(t, "pwd -P\nfor arg in \"$@\"; do echo \"$arg\"; done\n")
	run := catalog.Run{
		Bin:  "server",
		Args: []string{"-data", catalog.DataDirArgument, "--log=" + catalog.DataDirArgument + "/server.log"},
		InitializationOptions: map[string]any{
			"cargo":     map[string]any{"targetDir": catalog.DataDirArgument + "/target"},
			"paths":     []any{catalog.DataDirArgument, "fixed"},
			"checkOn":   false,
			"untouched": "value",
		},
	}
	process, options, err := NewLauncher(home, NewToolchain()).Start(t.Context(), installation, run, root)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(process.Kill)
	if info, err := os.Stat(dataDir); err != nil || !info.IsDir() {
		t.Errorf("data dir %s: %v, want it created", dataDir, err)
	}
	wantOptions := map[string]any{
		"cargo":     map[string]any{"targetDir": dataDir + "/target"},
		"paths":     []any{dataDir, "fixed"},
		"checkOn":   false,
		"untouched": "value",
	}
	if !reflect.DeepEqual(options, wantOptions) {
		t.Errorf("options = %v, want %v", options, wantOptions)
	}
	want := []string{realPath(t, root), "-data", dataDir, "--log=" + dataDir + "/server.log"}
	if got := outputLines(t, process); !slices.Equal(got, want) {
		t.Errorf("process saw %q, want %q", got, want)
	}
	if args := run.Args; args[1] != catalog.DataDirArgument {
		t.Errorf("Start changed the catalog run args to %q", args)
	}
	if target := run.InitializationOptions["cargo"].(map[string]any)["targetDir"]; target != catalog.DataDirArgument+"/target" {
		t.Errorf("Start changed the catalog run options to %v", target)
	}
}

func TestLauncherStartWithoutTheDataDir(t *testing.T) {
	skipWithoutUnixModes(t)
	fakeToolPath(t)
	home := Home{root: t.TempDir()}
	root := t.TempDir()
	installation := echoInstallation(t, "for arg in \"$@\"; do echo \"$arg\"; done\n")
	options := map[string]any{"tsserver": map[string]any{"useSyntaxServer": "never"}}
	run := catalog.Run{Bin: "server", Args: []string{"--stdio"}, InitializationOptions: options}
	process, resolved, err := NewLauncher(home, NewToolchain()).Start(t.Context(), installation, run, root)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(process.Kill)
	requireMissing(t, home.DataDir("jdtls", root))
	requireMissing(t, filepath.Join(home.ServersDir(), ".data"))
	if !maps.EqualFunc(resolved, options, func(left, right any) bool {
		return reflect.DeepEqual(left, right)
	}) {
		t.Errorf("options = %v, want %v", resolved, options)
	}
	if got := outputLines(t, process); !slices.Equal(got, []string{"--stdio"}) {
		t.Errorf("process saw %q, want [--stdio]", got)
	}
}

func TestLauncherStartWithoutTheRunner(t *testing.T) {
	skipWithoutUnixModes(t)
	fakeToolPath(t)
	installation := Installation{ID: "pyright", Bin: catalog.Bin{Kind: catalog.BinNode, Path: "langserver.index.js"}, Dir: t.TempDir()}
	process, _, err := NewLauncher(Home{root: t.TempDir()}, NewToolchain()).Start(t.Context(), installation, catalog.Run{Bin: "pyright"}, t.TempDir())
	if err == nil || process != nil {
		t.Fatalf("Start = %v, %v, want an error without node on PATH", process, err)
	}
}

func TestProcess(t *testing.T) {
	skipWithoutUnixModes(t)
	fakeToolPath(t)
	t.Run("stdin and stdout carry the protocol", func(t *testing.T) {
		installation := echoInstallation(t, "cat\n")
		process, err := installation.Start(t.Context(), NewToolchain(), nil, t.TempDir())
		if err != nil {
			t.Fatal(err)
		}
		if process.Err() != nil {
			t.Errorf("Err before exit = %v, want nil", process.Err())
		}
		if _, err := io.WriteString(process, "Content-Length: 2\r\n\r\n{}"); err != nil {
			t.Fatal(err)
		}
		if err := process.Close(); err != nil {
			t.Fatal(err)
		}
		output, err := io.ReadAll(process)
		if err != nil {
			t.Fatal(err)
		}
		if string(output) != "Content-Length: 2\r\n\r\n{}" {
			t.Errorf("output = %q, want the echoed message", output)
		}
		waitDone(t, process)
		if err := process.Err(); err == nil || !strings.Contains(err.Error(), "jdtls exited") {
			t.Errorf("Err = %v, want jdtls exited", err)
		}
	})
	t.Run("a crash carries the stderr tail", func(t *testing.T) {
		installation := echoInstallation(t, "echo 'fatal: no workspace' >&2\nexit 3\n")
		process, err := installation.Start(t.Context(), NewToolchain(), nil, t.TempDir())
		if err != nil {
			t.Fatal(err)
		}
		waitDone(t, process)
		err = process.Err()
		if err == nil || !strings.Contains(err.Error(), "exit status 3") || !strings.Contains(err.Error(), "fatal: no workspace") {
			t.Errorf("Err = %v, want the exit status and the stderr tail", err)
		}
	})
	t.Run("kill stops a server that hangs", func(t *testing.T) {
		installation := echoInstallation(t, "exec sleep 30\n")
		process, err := installation.Start(t.Context(), NewToolchain(), nil, t.TempDir())
		if err != nil {
			t.Fatal(err)
		}
		process.Kill()
		waitDone(t, process)
		if process.Err() == nil {
			t.Error("Err = nil, want the kill")
		}
	})
	t.Run("a canceled context kills the server", func(t *testing.T) {
		installation := echoInstallation(t, "exec sleep 30\n")
		ctx, cancel := context.WithCancel(t.Context())
		process, err := installation.Start(ctx, NewToolchain(), nil, t.TempDir())
		if err != nil {
			t.Fatal(err)
		}
		cancel()
		waitDone(t, process)
	})
}
