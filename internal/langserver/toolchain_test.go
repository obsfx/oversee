package langserver

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/obsfx/oversee/internal/catalog"
	"github.com/obsfx/oversee/internal/domain"
)

var systemPath = os.Getenv("PATH")

func shellScript(body string) string {
	return fmt.Sprintf("#!/bin/sh\nPATH='%s'\n%s", systemPath, body)
}

func writeExecutable(t *testing.T, dir, name, script string) string {
	t.Helper()
	path := filepath.Join(dir, name)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(script), 0o755); err != nil {
		t.Fatal(err)
	}
	return path
}

func fakeToolPath(t *testing.T, tools ...string) string {
	t.Helper()
	dir := t.TempDir()
	for _, tool := range tools {
		writeExecutable(t, dir, tool, "#!/bin/sh\n")
	}
	t.Setenv("PATH", dir)
	t.Setenv(javaHomeEnv, "")
	return dir
}

type fakeTool struct {
	output string
	stderr bool
	exit   int
}

func writeFakeTool(t *testing.T, dir, name string, tool fakeTool) string {
	t.Helper()
	writeText(t, filepath.Join(dir, name+".out"), tool.output)
	redirect := ""
	if tool.stderr {
		redirect = " >&2"
	}
	return writeExecutable(t, dir, name, shellScript(fmt.Sprintf("echo call >> \"$0.calls\"\ncat \"$0.out\"%s\nexit %d\n", redirect, tool.exit)))
}

func callCount(t *testing.T, tool string) int {
	t.Helper()
	content, err := os.ReadFile(tool + ".calls")
	if os.IsNotExist(err) {
		return 0
	}
	if err != nil {
		t.Fatal(err)
	}
	return strings.Count(string(content), "call\n")
}

const (
	temurin21 = "openjdk version \"21.0.2\" 2024-01-16 LTS\nOpenJDK Runtime Environment Temurin-21.0.2+13 (build 21.0.2+13-LTS)\nOpenJDK 64-Bit Server VM Temurin-21.0.2+13 (build 21.0.2+13-LTS, mixed mode, sharing)\n"
	openjdk17 = "openjdk version \"17.0.9\" 2023-10-17\nOpenJDK Runtime Environment Homebrew (build 17.0.9+0)\nOpenJDK 64-Bit Server VM Homebrew (build 17.0.9+0, mixed mode, sharing)\n"
	oracle8   = "java version \"1.8.0_391\"\nJava(TM) SE Runtime Environment (build 1.8.0_391-b13)\nJava HotSpot(TM) 64-Bit Server VM (build 25.391-b13, mixed mode)\n"
	macStub   = "The operation couldn't be completed. Unable to locate a Java Runtime.\nPlease visit http://www.java.com for information on installing Java.\n"

	dotnetMac     = "Microsoft.AspNetCore.App 6.0.25 [/usr/local/share/dotnet/shared/Microsoft.AspNetCore.App]\nMicrosoft.AspNetCore.App 8.0.1 [/usr/local/share/dotnet/shared/Microsoft.AspNetCore.App]\nMicrosoft.NETCore.App 6.0.25 [/usr/local/share/dotnet/shared/Microsoft.NETCore.App]\nMicrosoft.NETCore.App 8.0.1 [/usr/local/share/dotnet/shared/Microsoft.NETCore.App]\n"
	dotnetOld     = "Microsoft.NETCore.App 3.1.32 [/usr/share/dotnet/shared/Microsoft.NETCore.App]\nMicrosoft.NETCore.App 5.0.17 [/usr/share/dotnet/shared/Microsoft.NETCore.App]\n"
	dotnetAspOnly = "Microsoft.AspNetCore.App 8.0.1 [/usr/local/share/dotnet/shared/Microsoft.AspNetCore.App]\n"
)

func TestParseJavaMajor(t *testing.T) {
	tests := []struct {
		name      string
		output    string
		wantMajor int
		wantKnown bool
	}{
		{name: "temurin 21", output: temurin21, wantMajor: 21, wantKnown: true},
		{name: "homebrew openjdk 17", output: openjdk17, wantMajor: 17, wantKnown: true},
		{name: "oracle 8 with the legacy 1.x scheme", output: oracle8, wantMajor: 8, wantKnown: true},
		{name: "oracle 7", output: "java version \"1.7.0_80\"\nJava(TM) SE Runtime Environment (build 1.7.0_80-b15)\n", wantMajor: 7, wantKnown: true},
		{name: "a GA release without a minor version", output: "openjdk version \"17\" 2021-09-14\nOpenJDK Runtime Environment (build 17+35-2724)\n", wantMajor: 17, wantKnown: true},
		{name: "an early access build", output: "openjdk version \"23-ea\" 2024-09-17\nOpenJDK Runtime Environment (build 23-ea+37-2369)\n", wantMajor: 23, wantKnown: true},
		{name: "graalvm", output: "java version \"21.0.1\" 2023-10-17\nJava(TM) SE Runtime Environment Oracle GraalVM 21.0.1+12.1 (build 21.0.1+12-jvmci-23.1-b19)\n", wantMajor: 21, wantKnown: true},
		{name: "a JAVA_TOOL_OPTIONS line before the version", output: "Picked up JAVA_TOOL_OPTIONS: -Dfile.encoding=UTF-8\n" + temurin21, wantMajor: 21, wantKnown: true},
		{name: "the macOS stub without a JDK", output: macStub},
		{name: "no output"},
		{name: "an unknown format", output: "java 21 something\n"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			major, known := parseJavaMajor(test.output)
			if major != test.wantMajor || known != test.wantKnown {
				t.Errorf("parseJavaMajor = %d, %t, want %d, %t", major, known, test.wantMajor, test.wantKnown)
			}
		})
	}
}

func TestParseDotnetRuntimeMajor(t *testing.T) {
	tests := []struct {
		name      string
		output    string
		wantMajor int
		wantKnown bool
	}{
		{name: "macOS with 6 and 8", output: dotnetMac, wantMajor: 8, wantKnown: true},
		{name: "linux with old runtimes", output: dotnetOld, wantMajor: 5, wantKnown: true},
		{name: "windows line endings and the desktop runtime", output: "Microsoft.AspNetCore.App 7.0.14 [C:\\Program Files\\dotnet\\shared\\Microsoft.AspNetCore.App]\r\nMicrosoft.NETCore.App 7.0.14 [C:\\Program Files\\dotnet\\shared\\Microsoft.NETCore.App]\r\nMicrosoft.WindowsDesktop.App 7.0.14 [C:\\Program Files\\dotnet\\shared\\Microsoft.WindowsDesktop.App]\r\n", wantMajor: 7, wantKnown: true},
		{name: "a preview runtime", output: "Microsoft.NETCore.App 9.0.0-preview.1.24080.9 [/usr/share/dotnet/shared/Microsoft.NETCore.App]\n", wantMajor: 9, wantKnown: true},
		{name: "the highest runtime wins in any order", output: "Microsoft.NETCore.App 8.0.1 [/a]\nMicrosoft.NETCore.App 6.0.25 [/a]\n", wantMajor: 8, wantKnown: true},
		{name: "a broken line is skipped", output: "Microsoft.NETCore.App x.0 [/a]\nMicrosoft.NETCore.App 6.0.25 [/a]\n", wantMajor: 6, wantKnown: true},
		{name: "only the ASP.NET Core runtime", output: dotnetAspOnly},
		{name: "no runtimes"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			major, known := parseDotnetRuntimeMajor(test.output)
			if major != test.wantMajor || known != test.wantKnown {
				t.Errorf("parseDotnetRuntimeMajor = %d, %t, want %d, %t", major, known, test.wantMajor, test.wantKnown)
			}
		})
	}
}

func TestToolchainCommand(t *testing.T) {
	skipWithoutUnixModes(t)
	dir := fakeToolPath(t, "node")
	writeText(t, filepath.Join(dir, "go"), "not executable")
	toolchain := NewToolchain()
	node, err := toolchain.Command(catalog.RequiresNode)
	if err != nil || node != filepath.Join(dir, "node") {
		t.Errorf("Command(node) = %q, %v, want %s", node, err, filepath.Join(dir, "node"))
	}
	for _, requirement := range []catalog.Requirement{catalog.RequiresGo, catalog.RequiresNpm} {
		if _, err := toolchain.Command(requirement); err == nil || err.Error() != string(requirement)+" is not on PATH" {
			t.Errorf("Command(%s) error = %v, want %s is not on PATH", requirement, err, requirement)
		}
	}
}

func TestToolchainCommandUsesJavaHome(t *testing.T) {
	skipWithoutUnixModes(t)
	pathDir := fakeToolPath(t, "java", "node")
	pathJava := filepath.Join(pathDir, "java")
	homeWithJava := t.TempDir()
	homeJava := writeExecutable(t, filepath.Join(homeWithJava, "bin"), "java", "#!/bin/sh\n")
	homeWithDirectory := t.TempDir()
	mkdirs(t, filepath.Join(homeWithDirectory, "bin", "java"))
	tests := []struct {
		name        string
		javaHome    string
		requirement catalog.Requirement
		want        string
	}{
		{name: "JAVA_HOME java wins over PATH", javaHome: homeWithJava, requirement: catalog.RequiresJava, want: homeJava},
		{name: "JAVA_HOME without bin/java falls back to PATH", javaHome: t.TempDir(), requirement: catalog.RequiresJava, want: pathJava},
		{name: "JAVA_HOME with a directory at bin/java falls back to PATH", javaHome: homeWithDirectory, requirement: catalog.RequiresJava, want: pathJava},
		{name: "JAVA_HOME only applies to java", javaHome: homeWithJava, requirement: catalog.RequiresNode, want: filepath.Join(pathDir, "node")},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Setenv(javaHomeEnv, test.javaHome)
			got, err := NewToolchain().Command(test.requirement)
			if err != nil || got != test.want {
				t.Errorf("Command(%s) = %q, %v, want %s", test.requirement, got, err, test.want)
			}
		})
	}
}

func TestToolchainMissing(t *testing.T) {
	skipWithoutUnixModes(t)
	java := catalog.RequiresJava
	dotnet := catalog.RequiresDotnet
	tests := []struct {
		name         string
		tools        map[string]fakeTool
		requirements []catalog.Requirement
		minimums     map[catalog.Requirement]string
		want         []domain.MissingTool
	}{
		{name: "a tool that is not on PATH", requirements: []catalog.Requirement{catalog.RequiresNode, java}, want: []domain.MissingTool{{Tool: "node"}, {Tool: "java"}}},
		{name: "java new enough", tools: map[string]fakeTool{"java": {output: temurin21, stderr: true}}, requirements: []catalog.Requirement{java}, minimums: map[catalog.Requirement]string{java: "21"}},
		{name: "java too old", tools: map[string]fakeTool{"java": {output: openjdk17, stderr: true}}, requirements: []catalog.Requirement{java}, minimums: map[catalog.Requirement]string{java: "21"}, want: []domain.MissingTool{{Tool: "java", Minimum: "21", Found: "17"}}},
		{name: "java 8 in the legacy scheme", tools: map[string]fakeTool{"java": {output: oracle8, stderr: true}}, requirements: []catalog.Requirement{java}, minimums: map[catalog.Requirement]string{java: "21"}, want: []domain.MissingTool{{Tool: "java", Minimum: "21", Found: "8"}}},
		{name: "java that can not run", tools: map[string]fakeTool{"java": {output: macStub, stderr: true, exit: 1}}, requirements: []catalog.Requirement{java}, minimums: map[catalog.Requirement]string{java: "21"}, want: []domain.MissingTool{{Tool: "java"}}},
		{name: "java with an unknown version does not block", tools: map[string]fakeTool{"java": {output: "java 21 something\n", stderr: true}}, requirements: []catalog.Requirement{java}, minimums: map[catalog.Requirement]string{java: "21"}},
		{name: "dotnet new enough", tools: map[string]fakeTool{"dotnet": {output: dotnetMac}}, requirements: []catalog.Requirement{dotnet}, minimums: map[catalog.Requirement]string{dotnet: "6"}},
		{name: "dotnet too old", tools: map[string]fakeTool{"dotnet": {output: dotnetOld}}, requirements: []catalog.Requirement{dotnet}, minimums: map[catalog.Requirement]string{dotnet: "6"}, want: []domain.MissingTool{{Tool: "dotnet", Minimum: "6", Found: "5"}}},
		{name: "dotnet without a NETCore runtime", tools: map[string]fakeTool{"dotnet": {output: dotnetAspOnly}}, requirements: []catalog.Requirement{dotnet}, minimums: map[catalog.Requirement]string{dotnet: "6"}, want: []domain.MissingTool{{Tool: "dotnet"}}},
		{name: "dotnet that fails", tools: map[string]fakeTool{"dotnet": {exit: 1}}, requirements: []catalog.Requirement{dotnet}, minimums: map[catalog.Requirement]string{dotnet: "6"}, want: []domain.MissingTool{{Tool: "dotnet"}}},
		{name: "a minimum without a version probe does not block", tools: map[string]fakeTool{"node": {exit: 1}}, requirements: []catalog.Requirement{catalog.RequiresNode}, minimums: map[catalog.Requirement]string{catalog.RequiresNode: "99"}},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			dir := fakeToolPath(t)
			for name, tool := range test.tools {
				writeFakeTool(t, dir, name, tool)
			}
			got := NewToolchain().Missing(test.requirements, test.minimums)
			if !slices.Equal(got, test.want) {
				t.Errorf("Missing = %+v, want %+v", got, test.want)
			}
		})
	}
}

func TestToolchainMissingProbesOnlyWithAMinimum(t *testing.T) {
	skipWithoutUnixModes(t)
	java := writeFakeTool(t, fakeToolPath(t), "java", fakeTool{output: openjdk17, stderr: true})
	if missing := NewToolchain().Missing([]catalog.Requirement{catalog.RequiresJava}, nil); len(missing) != 0 {
		t.Errorf("Missing = %+v, want none", missing)
	}
	if calls := callCount(t, java); calls != 0 {
		t.Errorf("java ran %d times, want no version probe without a minimum", calls)
	}
}

func TestToolchainMissingCachesVersions(t *testing.T) {
	skipWithoutUnixModes(t)
	requirements := []catalog.Requirement{catalog.RequiresJava}
	minimums := map[catalog.Requirement]string{catalog.RequiresJava: "21"}
	want := []domain.MissingTool{{Tool: "java", Minimum: "21", Found: "17"}}
	t.Run("a cached version is reused", func(t *testing.T) {
		java := writeFakeTool(t, fakeToolPath(t), "java", fakeTool{output: openjdk17, stderr: true})
		toolchain := NewToolchain()
		for range 3 {
			if got := toolchain.Missing(requirements, minimums); !slices.Equal(got, want) {
				t.Fatalf("Missing = %+v, want %+v", got, want)
			}
		}
		if calls := callCount(t, java); calls != 1 {
			t.Errorf("java ran %d times, want 1", calls)
		}
	})
	t.Run("an expired version is probed again", func(t *testing.T) {
		java := writeFakeTool(t, fakeToolPath(t), "java", fakeTool{output: openjdk17, stderr: true})
		toolchain := NewToolchain()
		toolchain.versions.entries[java] = toolVersion{major: 25, known: true, checked: time.Now().Add(-versionLifetime - time.Second)}
		if got := toolchain.Missing(requirements, minimums); !slices.Equal(got, want) {
			t.Fatalf("Missing = %+v, want %+v", got, want)
		}
		if calls := callCount(t, java); calls != 1 {
			t.Errorf("java ran %d times, want 1", calls)
		}
	})
	t.Run("a toolchain without a cache probes every time", func(t *testing.T) {
		java := writeFakeTool(t, fakeToolPath(t), "java", fakeTool{output: openjdk17, stderr: true})
		var toolchain Toolchain
		for range 2 {
			if got := toolchain.Missing(requirements, minimums); !slices.Equal(got, want) {
				t.Fatalf("Missing = %+v, want %+v", got, want)
			}
		}
		if calls := callCount(t, java); calls != 2 {
			t.Errorf("java ran %d times, want 2", calls)
		}
	})
}

func TestVersionProbeTimeoutDoesNotBlock(t *testing.T) {
	skipWithoutUnixModes(t)
	dir := fakeToolPath(t)
	probes := []struct {
		requirement catalog.Requirement
		probe       func(ctx context.Context, command string) toolVersion
	}{
		{requirement: catalog.RequiresJava, probe: javaMajor},
		{requirement: catalog.RequiresDotnet, probe: dotnetRuntimeMajor},
	}
	for _, test := range probes {
		t.Run(string(test.requirement), func(t *testing.T) {
			command := writeExecutable(t, dir, string(test.requirement), shellScript("exec sleep 30\n"))
			ctx, cancel := context.WithTimeout(t.Context(), 50*time.Millisecond)
			defer cancel()
			started := time.Now()
			version := test.probe(ctx, command)
			if elapsed := time.Since(started); elapsed > 10*time.Second {
				t.Errorf("probe took %v after its deadline", elapsed)
			}
			if version.failed || version.known {
				t.Fatalf("probe = %+v, want neither failed nor known", version)
			}
			version.checked = time.Now()
			toolchain := NewToolchain()
			toolchain.versions.entries[command] = version
			if missing := toolchain.Missing([]catalog.Requirement{test.requirement}, map[catalog.Requirement]string{test.requirement: "99"}); len(missing) != 0 {
				t.Errorf("Missing = %+v, want a timed out probe not to block", missing)
			}
		})
	}
}
