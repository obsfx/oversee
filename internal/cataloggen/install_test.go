package cataloggen

import (
	"maps"
	"reflect"
	"slices"
	"strings"
	"testing"

	"github.com/obsfx/oversee/internal/catalog"
)

func TestMasonPackageInstallNamed(t *testing.T) {
	cases := []struct {
		name string
		pkg  MasonPackage
		want catalog.Install
	}{
		{
			name: "npm",
			pkg: MasonPackage{
				Source: MasonSource{ID: "pkg:npm/pyright@1.1.400"},
				Bin:    map[string]string{"pyright": "npm:pyright", "pyright-langserver": "npm:pyright-langserver"},
			},
			want: catalog.Install{
				Type:    catalog.InstallNpm,
				Package: "pyright",
				Version: "1.1.400",
				Bins: map[string]catalog.Bin{
					"pyright":            {Kind: catalog.BinNpm, Path: "pyright"},
					"pyright-langserver": {Kind: catalog.BinNpm, Path: "pyright-langserver"},
				},
			},
		},
		{
			name: "scoped npm with extra packages",
			pkg: MasonPackage{
				Source: MasonSource{ID: "pkg:npm/%40vue/language-server@2.1.6", ExtraPackages: []string{"typescript"}},
				Bin:    map[string]string{"vue-language-server": "npm:vue-language-server"},
			},
			want: catalog.Install{
				Type:          catalog.InstallNpm,
				Package:       "@vue/language-server",
				Version:       "2.1.6",
				ExtraPackages: []string{"typescript"},
				Bins:          map[string]catalog.Bin{"vue-language-server": {Kind: catalog.BinNpm, Path: "vue-language-server"}},
			},
		},
		{
			name: "npm with a node bin and the version in its path",
			pkg: MasonPackage{
				Source: MasonSource{ID: "pkg:npm/acme-ls@3.0.0"},
				Bin:    map[string]string{"acme-ls": "node:node_modules/acme-ls/{{version}}/./cli.js"},
			},
			want: catalog.Install{
				Type:    catalog.InstallNpm,
				Package: "acme-ls",
				Version: "3.0.0",
				Bins:    map[string]catalog.Bin{"acme-ls": {Kind: catalog.BinNode, Path: "node_modules/acme-ls/3.0.0/cli.js"}},
			},
		},
		{
			name: "golang with a subpath",
			pkg: MasonPackage{
				Source: MasonSource{ID: "pkg:golang/golang.org/x/tools@v0.30.0#gopls"},
				Bin:    map[string]string{"gopls": "golang:gopls"},
			},
			want: catalog.Install{
				Type:    catalog.InstallGolang,
				Package: "golang.org/x/tools/gopls",
				Version: "v0.30.0",
				Bins:    map[string]catalog.Bin{"gopls": {Kind: catalog.BinGolang, Path: "gopls"}},
			},
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			resolution, err := c.pkg.Install()
			if err != nil {
				t.Fatalf("Install() = %v", err)
			}
			if !reflect.DeepEqual(resolution.Install, c.want) {
				t.Fatalf("Install() = %+v, want %+v", resolution.Install, c.want)
			}
			if len(resolution.Skipped) != 0 {
				t.Fatalf("Install() skipped %v", resolution.Skipped)
			}
		})
	}
}

func TestMasonPackageInstallGitHubAssets(t *testing.T) {
	pkg := MasonPackage{
		Source: MasonSource{
			ID: "pkg:github/LuaLS/lua-language-server@3.13.5",
			Asset: []any{
				map[string]any{"target": "darwin_arm64", "file": "lua-language-server-{{version}}-darwin-arm64.tar.gz:libexec/", "bin": "libexec/bin/lua-language-server"},
				map[string]any{"target": "linux_x64_gnu", "file": "lua-language-server-{{version}}-linux-x64.tar.gz:libexec/", "bin": "libexec/bin/lua-language-server"},
				map[string]any{"target": "win_x64", "file": "lua-language-server-{{version}}-win32-x64.zip:libexec/", "bin": "libexec/bin/lua-language-server.exe"},
			},
		},
		Bin: map[string]string{"lua-language-server": "{{source.asset.bin}}"},
	}
	resolution, err := pkg.Install()
	if err != nil {
		t.Fatalf("Install() = %v", err)
	}
	release := "https://github.com/LuaLS/lua-language-server/releases/download/3.13.5/"
	want := catalog.Install{
		Type:    catalog.InstallDownload,
		Package: "LuaLS/lua-language-server",
		Version: "3.13.5",
		Platforms: map[catalog.Platform]catalog.Download{
			catalog.PlatformDarwinArm64: {
				Files: []catalog.File{{URL: release + "lua-language-server-3.13.5-darwin-arm64.tar.gz", Name: "lua-language-server-3.13.5-darwin-arm64.tar.gz", Dest: "libexec"}},
				Bins:  map[string]catalog.Bin{"lua-language-server": {Kind: catalog.BinExec, Path: "libexec/bin/lua-language-server"}},
			},
			catalog.PlatformLinuxX64Gnu: {
				Files: []catalog.File{{URL: release + "lua-language-server-3.13.5-linux-x64.tar.gz", Name: "lua-language-server-3.13.5-linux-x64.tar.gz", Dest: "libexec"}},
				Bins:  map[string]catalog.Bin{"lua-language-server": {Kind: catalog.BinExec, Path: "libexec/bin/lua-language-server"}},
			},
			catalog.PlatformWindowsX64: {
				Files: []catalog.File{{URL: release + "lua-language-server-3.13.5-win32-x64.zip", Name: "lua-language-server-3.13.5-win32-x64.zip", Dest: "libexec"}},
				Bins:  map[string]catalog.Bin{"lua-language-server": {Kind: catalog.BinExec, Path: "libexec/bin/lua-language-server.exe"}},
			},
		},
	}
	if !reflect.DeepEqual(resolution.Install, want) {
		t.Fatalf("Install() = %+v, want %+v", resolution.Install, want)
	}
	if len(resolution.Skipped) != 0 {
		t.Fatalf("Install() skipped %v", resolution.Skipped)
	}
}

func TestMasonPackageInstallSkipsPlatformsThatFail(t *testing.T) {
	pkg := MasonPackage{
		Source: MasonSource{
			ID: "pkg:github/zigtools/zls@0.14.0",
			Asset: []any{
				map[string]any{"target": "darwin_arm64", "file": "zls-aarch64-macos.tar.xz", "bin": "zls"},
				map[string]any{"target": "linux_x64_gnu", "file": "zls-x86_64-linux.tar.xz"},
				map[string]any{"target": "win_x64", "file": "zls-x86_64-windows.zip:../", "bin": "zls.exe"},
				map[string]any{"target": "linux_arm64", "file": "zls-{{ version | lower }}.tar.xz", "bin": "zls"},
			},
		},
		Bin: map[string]string{"zls": "{{source.asset.bin}}"},
	}
	resolution, err := pkg.Install()
	if err != nil {
		t.Fatalf("Install() = %v", err)
	}
	if got := slices.Sorted(maps.Keys(resolution.Install.Platforms)); !slices.Equal(got, []catalog.Platform{catalog.PlatformDarwinArm64}) {
		t.Fatalf("platforms = %v, want only darwin-arm64", got)
	}
	wantSkipped := map[catalog.Platform]string{
		catalog.PlatformLinuxX64Gnu:    `bin zls: template "{{source.asset.bin}}": "source.asset.bin" has no "bin"`,
		catalog.PlatformWindowsX64:     `file "zls-x86_64-windows.zip:../" leaves the install directory`,
		catalog.PlatformLinuxArm64Gnu:  `unknown filter "lower"`,
		catalog.PlatformLinuxArm64Musl: `unknown filter "lower"`,
	}
	if got := slices.Sorted(maps.Keys(resolution.Skipped)); !slices.Equal(got, slices.Sorted(maps.Keys(wantSkipped))) {
		t.Fatalf("skipped %v, want %v", got, slices.Sorted(maps.Keys(wantSkipped)))
	}
	for platform, want := range wantSkipped {
		if err := resolution.Skipped[platform]; err == nil || !strings.Contains(err.Error(), want) {
			t.Errorf("%s skipped with %v, want %q", platform, err, want)
		}
	}
}

func TestMasonPackageInstallFileSpecs(t *testing.T) {
	const release = "https://github.com/acme/tool/releases/download/v1.0.0/"
	cases := []struct {
		name      string
		file      any
		bin       string
		wantFiles []catalog.File
		wantBin   catalog.Bin
	}{
		{
			name:      "plain file",
			file:      "tool.zip",
			bin:       "exec:{{source.asset.file}}",
			wantFiles: []catalog.File{{URL: release + "tool.zip", Name: "tool.zip"}},
			wantBin:   catalog.Bin{Kind: catalog.BinExec, Path: "tool.zip"},
		},
		{
			name:      "file into a folder",
			file:      "tool-{{version}}.jar:libexec/",
			bin:       "java-jar:{{source.asset.file}}",
			wantFiles: []catalog.File{{URL: release + "tool-v1.0.0.jar", Name: "tool-v1.0.0.jar", Dest: "libexec"}},
			wantBin:   catalog.Bin{Kind: catalog.BinJava, Path: "libexec/tool-v1.0.0.jar"},
		},
		{
			name:      "renamed file",
			file:      "tool-aarch64-apple-darwin.gz:tool",
			bin:       "{{source.asset.file}}",
			wantFiles: []catalog.File{{URL: release + "tool-aarch64-apple-darwin.gz", Name: "tool"}},
			wantBin:   catalog.Bin{Kind: catalog.BinExec, Path: "tool"},
		},
		{
			name:      "renamed into a folder",
			file:      "server.jar:lib/tool.jar",
			bin:       "java-jar:{{source.asset.file}}",
			wantFiles: []catalog.File{{URL: release + "server.jar", Name: "tool.jar", Dest: "lib"}},
			wantBin:   catalog.Bin{Kind: catalog.BinJava, Path: "lib/tool.jar"},
		},
		{
			name:      "source path only names the url",
			file:      "../tool.zip",
			bin:       "exec:{{source.asset.file}}",
			wantFiles: []catalog.File{{URL: release + "..%2Ftool.zip", Name: "tool.zip"}},
			wantBin:   catalog.Bin{Kind: catalog.BinExec, Path: "tool.zip"},
		},
		{
			name:      "file name escaped in the url",
			file:      "tool build+1.zip",
			bin:       "exec:bin/tool",
			wantFiles: []catalog.File{{URL: release + "tool%20build+1.zip", Name: "tool build+1.zip"}},
			wantBin:   catalog.Bin{Kind: catalog.BinExec, Path: "bin/tool"},
		},
		{
			name: "several files",
			file: []any{"tool.zip", "runtime.tar.gz:runtime/"},
			bin:  "exec:bin/tool",
			wantFiles: []catalog.File{
				{URL: release + "tool.zip", Name: "tool.zip"},
				{URL: release + "runtime.tar.gz", Name: "runtime.tar.gz", Dest: "runtime"},
			},
			wantBin: catalog.Bin{Kind: catalog.BinExec, Path: "bin/tool"},
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			pkg := MasonPackage{
				Source: MasonSource{
					ID:    "pkg:github/acme/tool@v1.0.0",
					Asset: map[string]any{"target": "darwin_arm64", "file": c.file},
				},
				Bin: map[string]string{"tool": c.bin},
			}
			resolution, err := pkg.Install()
			if err != nil {
				t.Fatalf("Install() = %v", err)
			}
			want := catalog.Download{Files: c.wantFiles, Bins: map[string]catalog.Bin{"tool": c.wantBin}}
			if got := resolution.Install.Platforms[catalog.PlatformDarwinArm64]; !reflect.DeepEqual(got, want) {
				t.Fatalf("darwin-arm64 = %+v, want %+v", got, want)
			}
		})
	}
}

func TestMasonPackageInstallOpenVSX(t *testing.T) {
	pkg := MasonPackage{
		Source: MasonSource{
			ID:       "pkg:openvsx/acme/acme-vscode@1.4.0",
			Download: map[string]any{"file": "acme.acme-vscode-{{version}}.vsix:extension/"},
		},
		Bin: map[string]string{"acme-ls": "node:{{source.download.file}}"},
	}
	resolution, err := pkg.Install()
	if err != nil {
		t.Fatalf("Install() = %v", err)
	}
	want := catalog.Download{
		Files: []catalog.File{{URL: "https://open-vsx.org/api/acme/acme-vscode/1.4.0/file/acme.acme-vscode-1.4.0.vsix", Name: "acme.acme-vscode-1.4.0.vsix", Dest: "extension"}},
		Bins:  map[string]catalog.Bin{"acme-ls": {Kind: catalog.BinNode, Path: "extension/acme.acme-vscode-1.4.0.vsix"}},
	}
	if got := slices.Sorted(maps.Keys(resolution.Install.Platforms)); !slices.Equal(got, slices.Sorted(slices.Values(catalog.Platforms))) {
		t.Fatalf("platforms = %v, want every platform", got)
	}
	for platform, download := range resolution.Install.Platforms {
		if !reflect.DeepEqual(download, want) {
			t.Fatalf("%s = %+v, want %+v", platform, download, want)
		}
	}
	if resolution.Install.Package != "acme/acme-vscode" || resolution.Install.Type != catalog.InstallDownload {
		t.Fatalf("install = %s %s", resolution.Install.Type, resolution.Install.Package)
	}
}

func TestMasonPackageInstallGeneric(t *testing.T) {
	pkg := MasonPackage{
		Source: MasonSource{
			ID:                 "pkg:generic/eclipse/eclipse.jdt.ls@v1.40.0",
			SupportedPlatforms: []string{"darwin", "linux_x64"},
			Download: map[string]any{
				"files": map[string]any{
					"jdtls.tar.gz":   `https://download.eclipse.org/jdtls/milestones/{{ version | strip_prefix "v" }}/jdt-language-server-{{ version | strip_prefix "v" }}.tar.gz`,
					"lib/lombok.jar": "https://projectlombok.org/downloads/lombok.jar",
				},
			},
		},
		Bin: map[string]string{"jdtls": "python:bin/jdtls"},
	}
	resolution, err := pkg.Install()
	if err != nil {
		t.Fatalf("Install() = %v", err)
	}
	want := catalog.Download{
		Files: []catalog.File{
			{URL: "https://download.eclipse.org/jdtls/milestones/1.40.0/jdt-language-server-1.40.0.tar.gz", Name: "jdtls.tar.gz"},
			{URL: "https://projectlombok.org/downloads/lombok.jar", Name: "lombok.jar", Dest: "lib"},
		},
		Bins: map[string]catalog.Bin{"jdtls": {Kind: catalog.BinPython, Path: "bin/jdtls"}},
	}
	wantPlatforms := []catalog.Platform{catalog.PlatformDarwinArm64, catalog.PlatformDarwinX64, catalog.PlatformLinuxX64Gnu, catalog.PlatformLinuxX64Musl}
	if got := slices.Sorted(maps.Keys(resolution.Install.Platforms)); !slices.Equal(got, slices.Sorted(slices.Values(wantPlatforms))) {
		t.Fatalf("platforms = %v, want %v", got, wantPlatforms)
	}
	for platform, download := range resolution.Install.Platforms {
		if !reflect.DeepEqual(download, want) {
			t.Fatalf("%s = %+v, want %+v", platform, download, want)
		}
	}
	if resolution.Install.Package != "eclipse/eclipse.jdt.ls" || resolution.Install.Version != "v1.40.0" {
		t.Fatalf("install = %s@%s", resolution.Install.Package, resolution.Install.Version)
	}
}

func TestMasonPackageInstallRejects(t *testing.T) {
	cases := []struct {
		name string
		pkg  MasonPackage
		want string
	}{
		{
			name: "invalid purl",
			pkg:  MasonPackage{Source: MasonSource{ID: "npm/pyright@1.1.400"}},
			want: "has no pkg: scheme",
		},
		{
			name: "unsupported source type",
			pkg:  MasonPackage{Source: MasonSource{ID: "pkg:pypi/python-lsp-server@1.12.0"}},
			want: `unsupported source type "pypi"`,
		},
		{
			name: "npm bin with a slash",
			pkg:  MasonPackage{Source: MasonSource{ID: "pkg:npm/acme-ls@1.0.0"}, Bin: map[string]string{"acme-ls": "npm:bin/acme-ls"}},
			want: `bin acme-ls: npm bin "bin/acme-ls" is not a plain name`,
		},
		{
			name: "unknown bin kind",
			pkg:  MasonPackage{Source: MasonSource{ID: "pkg:npm/acme-ls@1.0.0"}, Bin: map[string]string{"acme-ls": "ruby:acme-ls"}},
			want: `bin acme-ls: unknown bin kind "ruby"`,
		},
		{
			name: "bin leaves the install directory",
			pkg:  MasonPackage{Source: MasonSource{ID: "pkg:golang/example.com/acme@v1.0.0"}, Bin: map[string]string{"acme-ls": "exec:../acme-ls"}},
			want: `bin acme-ls: bin path "../acme-ls" leaves the install directory`,
		},
		{
			name: "named bin refers to a source field",
			pkg:  MasonPackage{Source: MasonSource{ID: "pkg:npm/acme-ls@1.0.0"}, Bin: map[string]string{"acme-ls": "{{source.asset.bin}}"}},
			want: `has no "source"`,
		},
		{
			name: "github without assets",
			pkg:  MasonPackage{Source: MasonSource{ID: "pkg:github/acme/acme-ls@1.0.0"}},
			want: "github source has no downloads",
		},
		{
			name: "generic without a download",
			pkg:  MasonPackage{Source: MasonSource{ID: "pkg:generic/acme/acme-ls@1.0.0"}},
			want: "generic source has no downloads",
		},
		{
			name: "assets only for other platforms",
			pkg: MasonPackage{Source: MasonSource{
				ID:    "pkg:github/acme/acme-ls@1.0.0",
				Asset: []any{map[string]any{"target": "freebsd_x64", "file": "acme.tar.gz"}},
			}},
			want: "no downloads for oversee platforms",
		},
		{
			name: "supported platforms exclude every asset",
			pkg: MasonPackage{Source: MasonSource{
				ID:                 "pkg:github/acme/acme-ls@1.0.0",
				SupportedPlatforms: []string{"win"},
				Asset:              []any{map[string]any{"target": "darwin", "file": "acme.tar.gz"}},
			}},
			want: "no downloads for oversee platforms",
		},
		{
			name: "every platform fails",
			pkg: MasonPackage{Source: MasonSource{
				ID:    "pkg:github/acme/acme-ls@1.0.0",
				Asset: map[string]any{"bin": "acme-ls"},
			}},
			want: "no downloads for oversee platforms",
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			resolution, err := c.pkg.Install()
			if err == nil || !strings.Contains(err.Error(), c.want) {
				t.Fatalf("Install() = %+v, %v, want an error containing %q", resolution, err, c.want)
			}
		})
	}
}

func TestInstallResolverFiles(t *testing.T) {
	cases := []struct {
		name   string
		purl   string
		fields map[string]any
		want   string
	}{
		{name: "asset without a file", purl: "pkg:github/acme/acme-ls@1.0.0", fields: map[string]any{"bin": "acme-ls"}, want: "github download has no file"},
		{name: "asset leaves the install directory", purl: "pkg:github/acme/acme-ls@1.0.0", fields: map[string]any{"file": "acme.zip:../"}, want: `file "acme.zip:../" leaves the install directory`},
		{name: "asset with an absolute destination", purl: "pkg:github/acme/acme-ls@1.0.0", fields: map[string]any{"file": "acme.zip:/opt/acme.zip"}, want: "leaves the install directory"},
		{name: "generic without files", purl: "pkg:generic/acme/acme-ls@1.0.0", fields: map[string]any{}, want: "generic download has no files"},
		{name: "generic with an empty file map", purl: "pkg:generic/acme/acme-ls@1.0.0", fields: map[string]any{"files": map[string]any{}}, want: "generic download has no files"},
		{name: "generic file without a url", purl: "pkg:generic/acme/acme-ls@1.0.0", fields: map[string]any{"files": map[string]any{"acme.zip": 1.0}}, want: `generic download "acme.zip" has no url`},
		{name: "generic file leaves the install directory", purl: "pkg:generic/acme/acme-ls@1.0.0", fields: map[string]any{"files": map[string]any{"../acme.zip": "https://example.com/acme.zip"}}, want: `generic download "../acme.zip" leaves the install directory`},
		{name: "generic file with an absolute path", purl: "pkg:generic/acme/acme-ls@1.0.0", fields: map[string]any{"files": map[string]any{"/tmp/acme.zip": "https://example.com/acme.zip"}}, want: "leaves the install directory"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			purl, err := ParsePurl(c.purl)
			if err != nil {
				t.Fatalf("ParsePurl() = %v", err)
			}
			files, err := installResolver{purl: purl}.files(c.fields)
			if err == nil || !strings.Contains(err.Error(), c.want) {
				t.Fatalf("files() = %+v, %v, want an error containing %q", files, err, c.want)
			}
		})
	}
}

func TestBinOf(t *testing.T) {
	cases := []struct {
		value string
		want  catalog.Bin
	}{
		{value: "npm:pyright", want: catalog.Bin{Kind: catalog.BinNpm, Path: "pyright"}},
		{value: "golang:gopls", want: catalog.Bin{Kind: catalog.BinGolang, Path: "gopls"}},
		{value: "bin/zls", want: catalog.Bin{Kind: catalog.BinExec, Path: "bin/zls"}},
		{value: "exec:./bin//zls", want: catalog.Bin{Kind: catalog.BinExec, Path: "bin/zls"}},
		{value: "java-jar:lib/server.jar", want: catalog.Bin{Kind: catalog.BinJava, Path: "lib/server.jar"}},
		{value: "dotnet:OmniSharp.dll", want: catalog.Bin{Kind: catalog.BinDotnet, Path: "OmniSharp.dll"}},
		{value: "exec:../zls", want: catalog.Bin{Kind: catalog.BinExec, Path: "../zls"}},
	}
	for _, c := range cases {
		t.Run(c.value, func(t *testing.T) {
			if got := binOf(c.value); got != c.want {
				t.Fatalf("binOf(%q) = %+v, want %+v", c.value, got, c.want)
			}
		})
	}
}
