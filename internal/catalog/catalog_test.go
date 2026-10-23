package catalog

import (
	"reflect"
	"slices"
	"strings"
	"testing"
)

const testSHA256 = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

func validCatalog() Catalog {
	return Catalog{
		SchemaVersion: SchemaVersion,
		FileTypes: map[string]FileType{
			"alpha": {Extensions: []string{"al"}, Filenames: []string{"Alphafile"}, Server: "alpha-ls"},
			"beta":  {Extensions: []string{"be"}, Server: "beta-ls"},
		},
		Servers: []Server{
			{
				ID:        "alpha-ls",
				Version:   "1.0.0",
				FileTypes: []string{"alpha"},
				Run:       Run{Bin: "alpha-ls"},
				Install: Install{
					Type:    InstallNpm,
					Package: "alpha-ls",
					Version: "1.0.0",
					Bins:    map[string]Bin{"alpha-ls": {Kind: BinNpm, Path: "alpha-ls"}},
				},
				Requires: []Requirement{RequiresNode, RequiresNpm},
			},
			{
				ID:        "beta-ls",
				Version:   "2.0.0",
				FileTypes: []string{"beta"},
				Run:       Run{Bin: "beta-ls"},
				Install: Install{
					Type:    InstallDownload,
					Package: "beta/beta-ls",
					Version: "2.0.0",
					Platforms: map[Platform]Download{
						PlatformDarwinArm64: {
							Files: []File{{URL: "https://example.com/beta-darwin.tar.gz", SHA256: testSHA256, Name: "beta-darwin.tar.gz", Dest: "libexec"}},
							Bins:  map[string]Bin{"beta-ls": {Kind: BinJava, Path: "libexec/beta.jar"}},
						},
						PlatformLinuxX64Gnu: {
							Files: []File{{URL: "https://example.com/beta-linux.tar.gz", SHA256: testSHA256, Name: "beta-linux.tar.gz"}},
							Bins:  map[string]Bin{"beta-ls": {Kind: BinExec, Path: "bin/beta-ls"}},
						},
					},
				},
				Requires: []Requirement{RequiresJava},
				Minimums: map[Requirement]string{RequiresJava: "21"},
			},
		},
	}
}

func alpha(c *Catalog) *Server {
	return &c.Servers[0]
}

func beta(c *Catalog) *Server {
	return &c.Servers[1]
}

func linuxDownload(c *Catalog) Download {
	return beta(c).Install.Platforms[PlatformLinuxX64Gnu]
}

func TestCatalogValidate(t *testing.T) {
	cases := []struct {
		name   string
		mutate func(c *Catalog)
		want   string
	}{
		{name: "valid catalog", mutate: func(c *Catalog) {}},
		{
			name: "an extension and a filename with the same text",
			mutate: func(c *Catalog) {
				c.FileTypes["beta"] = FileType{Extensions: []string{"be"}, Filenames: []string{"al"}, Server: "beta-ls"}
			},
		},
		{
			name: "schema version",
			mutate: func(c *Catalog) {
				c.SchemaVersion = SchemaVersion + 1
			},
			want: "catalog schema version 2, expected 1",
		},
		{
			name: "duplicate server",
			mutate: func(c *Catalog) {
				c.Servers = append(c.Servers, c.Servers[0])
			},
			want: `catalog server "alpha-ls" is listed twice`,
		},
		{
			name: "server without an id",
			mutate: func(c *Catalog) {
				alpha(c).ID = ""
			},
			want: "is missing its id, version, run bin or file types",
		},
		{
			name: "server without a version",
			mutate: func(c *Catalog) {
				alpha(c).Version = ""
			},
			want: "is missing its id, version, run bin or file types",
		},
		{
			name: "server without a run bin",
			mutate: func(c *Catalog) {
				alpha(c).Run.Bin = ""
			},
			want: "is missing its id, version, run bin or file types",
		},
		{
			name: "server without file types",
			mutate: func(c *Catalog) {
				alpha(c).FileTypes = nil
			},
			want: "is missing its id, version, run bin or file types",
		},
		{
			name: "file type points to a server that does not handle it",
			mutate: func(c *Catalog) {
				c.FileTypes["gamma"] = FileType{Extensions: []string{"ga"}, Server: "alpha-ls"}
			},
			want: `catalog file type "gamma" points to "alpha-ls", which does not handle it`,
		},
		{
			name: "file type points to an unknown server",
			mutate: func(c *Catalog) {
				c.FileTypes["beta"] = FileType{Extensions: []string{"be"}, Server: "missing-ls"}
			},
			want: `catalog file type "beta" points to "missing-ls", which does not handle it`,
		},
		{
			name: "server handles an unmapped file type",
			mutate: func(c *Catalog) {
				alpha(c).FileTypes = []string{"alpha", "delta"}
			},
			want: `catalog server "alpha-ls" handles "delta", which is not mapped to it`,
		},
		{
			name: "server handles a file type mapped to another server",
			mutate: func(c *Catalog) {
				beta(c).FileTypes = []string{"beta", "alpha"}
			},
			want: `catalog server "beta-ls" handles "alpha", which is not mapped to it`,
		},
		{
			name: "extension in two file types",
			mutate: func(c *Catalog) {
				c.FileTypes["beta"] = FileType{Extensions: []string{"be", "al"}, Server: "beta-ls"}
			},
			want: `catalog maps "*.al" to both`,
		},
		{
			name: "extension twice in one file type",
			mutate: func(c *Catalog) {
				c.FileTypes["beta"] = FileType{Extensions: []string{"be", "be"}, Server: "beta-ls"}
			},
			want: `catalog maps "*.be" to both beta and beta`,
		},
		{
			name: "filename in two file types",
			mutate: func(c *Catalog) {
				c.FileTypes["beta"] = FileType{Extensions: []string{"be"}, Filenames: []string{"Alphafile"}, Server: "beta-ls"}
			},
			want: `catalog maps "Alphafile" to both`,
		},
		{
			name: "unknown bin kind",
			mutate: func(c *Catalog) {
				alpha(c).Install.Bins["alpha-ls"] = Bin{Kind: "ruby", Path: "alpha-ls"}
			},
			want: `bin alpha-ls: unknown bin kind "ruby"`,
		},
		{
			name: "bin path leaves the install directory",
			mutate: func(c *Catalog) {
				linuxDownload(c).Bins["beta-ls"] = Bin{Kind: BinExec, Path: "../beta-ls"}
			},
			want: `bin beta-ls: bin path "../beta-ls" leaves the install directory`,
		},
		{
			name: "absolute bin path",
			mutate: func(c *Catalog) {
				linuxDownload(c).Bins["beta-ls"] = Bin{Kind: BinExec, Path: "/usr/bin/beta-ls"}
			},
			want: `bin path "/usr/bin/beta-ls" leaves the install directory`,
		},
		{
			name: "bin path that is not clean",
			mutate: func(c *Catalog) {
				linuxDownload(c).Bins["beta-ls"] = Bin{Kind: BinExec, Path: "bin/../../beta-ls"}
			},
			want: `bin path "bin/../../beta-ls" leaves the install directory`,
		},
		{
			name: "bin path with a backslash",
			mutate: func(c *Catalog) {
				linuxDownload(c).Bins["beta-ls"] = Bin{Kind: BinExec, Path: `bin\beta-ls`}
			},
			want: "leaves the install directory",
		},
		{
			name: "npm bin with a slash",
			mutate: func(c *Catalog) {
				alpha(c).Install.Bins["alpha-ls"] = Bin{Kind: BinNpm, Path: "node_modules/alpha-ls"}
			},
			want: `npm bin "node_modules/alpha-ls" is not a plain name`,
		},
		{
			name: "golang bin with a slash",
			mutate: func(c *Catalog) {
				alpha(c).Install = Install{Type: InstallGolang, Package: "example.com/alpha", Version: "v1.0.0", Bins: map[string]Bin{"alpha-ls": {Kind: BinGolang, Path: "cmd/alpha-ls"}}}
			},
			want: `golang bin "cmd/alpha-ls" is not a plain name`,
		},
		{
			name: "run bin missing on one platform",
			mutate: func(c *Catalog) {
				bins := linuxDownload(c).Bins
				delete(bins, "beta-ls")
				bins["other"] = Bin{Kind: BinExec, Path: "bin/other"}
			},
			want: `catalog server "beta-ls" runs "beta-ls", which is not one of its bins`,
		},
		{
			name: "run bin missing from npm bins",
			mutate: func(c *Catalog) {
				alpha(c).Run.Bin = "alpha-server"
			},
			want: `catalog server "alpha-ls" runs "alpha-server", which is not one of its bins`,
		},
		{
			name: "package looks like a flag",
			mutate: func(c *Catalog) {
				alpha(c).Install.Package = "--registry=https://example.com"
			},
			want: `install value "--registry=https://example.com" is empty or looks like a flag`,
		},
		{
			name: "version looks like a flag",
			mutate: func(c *Catalog) {
				alpha(c).Install.Version = "-1"
			},
			want: `install value "-1" is empty or looks like a flag`,
		},
		{
			name: "extra package looks like a flag",
			mutate: func(c *Catalog) {
				alpha(c).Install.ExtraPackages = []string{"typescript", "--ignore-scripts=false"}
			},
			want: `install value "--ignore-scripts=false" is empty or looks like a flag`,
		},
		{
			name: "empty install version",
			mutate: func(c *Catalog) {
				alpha(c).Install.Version = ""
			},
			want: `install value "" is empty or looks like a flag`,
		},
		{
			name: "unknown install type",
			mutate: func(c *Catalog) {
				alpha(c).Install.Type = "pip"
			},
			want: `unknown install type "pip"`,
		},
		{
			name: "npm install without bins",
			mutate: func(c *Catalog) {
				alpha(c).Install.Bins = nil
			},
			want: "npm install has no bins",
		},
		{
			name: "download install without platforms",
			mutate: func(c *Catalog) {
				beta(c).Install.Platforms = nil
			},
			want: "download install has no platforms",
		},
		{
			name: "download for an unknown platform",
			mutate: func(c *Catalog) {
				beta(c).Install.Platforms["plan9-x64"] = linuxDownload(c)
			},
			want: `download for "plan9-x64" is invalid`,
		},
		{
			name: "download without files",
			mutate: func(c *Catalog) {
				download := linuxDownload(c)
				download.Files = nil
				beta(c).Install.Platforms[PlatformLinuxX64Gnu] = download
			},
			want: `download for "linux-x64-gnu" is invalid`,
		},
		{
			name: "file served over http",
			mutate: func(c *Catalog) {
				linuxDownload(c).Files[0].URL = "http://example.com/beta-linux.tar.gz"
			},
			want: "file http://example.com/beta-linux.tar.gz is not served over https",
		},
		{
			name: "file name with a folder",
			mutate: func(c *Catalog) {
				linuxDownload(c).Files[0].Name = "dist/beta-linux.tar.gz"
			},
			want: `file name "dist/beta-linux.tar.gz" is not a plain file name`,
		},
		{
			name: "file name leaves the install directory",
			mutate: func(c *Catalog) {
				linuxDownload(c).Files[0].Name = ".."
			},
			want: `file name ".." is not a plain file name`,
		},
		{
			name: "empty file name",
			mutate: func(c *Catalog) {
				linuxDownload(c).Files[0].Name = ""
			},
			want: `file name "" is not a plain file name`,
		},
		{
			name: "file dest leaves the install directory",
			mutate: func(c *Catalog) {
				linuxDownload(c).Files[0].Dest = "../outside"
			},
			want: `file dest "../outside" leaves the install directory`,
		},
		{
			name: "absolute file dest",
			mutate: func(c *Catalog) {
				linuxDownload(c).Files[0].Dest = "/opt"
			},
			want: `file dest "/opt" leaves the install directory`,
		},
		{
			name: "file dest that is not clean",
			mutate: func(c *Catalog) {
				linuxDownload(c).Files[0].Dest = "libexec/../lib"
			},
			want: `file dest "libexec/../lib" leaves the install directory`,
		},
		{
			name: "uppercase sha256",
			mutate: func(c *Catalog) {
				linuxDownload(c).Files[0].SHA256 = strings.ToUpper(testSHA256)
			},
			want: "file https://example.com/beta-linux.tar.gz has no lowercase sha256",
		},
		{
			name: "short sha256",
			mutate: func(c *Catalog) {
				linuxDownload(c).Files[0].SHA256 = testSHA256[:63]
			},
			want: "has no lowercase sha256",
		},
		{
			name: "sha256 that is not hex",
			mutate: func(c *Catalog) {
				linuxDownload(c).Files[0].SHA256 = strings.Repeat("z", 64)
			},
			want: "has no lowercase sha256",
		},
		{
			name: "missing sha256",
			mutate: func(c *Catalog) {
				linuxDownload(c).Files[0].SHA256 = ""
			},
			want: "has no lowercase sha256",
		},
		{
			name: "unknown requirement",
			mutate: func(c *Catalog) {
				alpha(c).Requires = append(alpha(c).Requires, "ruby")
			},
			want: `catalog server "alpha-ls" requires unknown "ruby"`,
		},
		{
			name: "minimum for a tool that is not required",
			mutate: func(c *Catalog) {
				alpha(c).Minimums = map[Requirement]string{RequiresJava: "21"}
			},
			want: `catalog server "alpha-ls" sets a minimum for "java", which it does not require`,
		},
		{
			name: "minimum for a tool without a version probe",
			mutate: func(c *Catalog) {
				alpha(c).Minimums = map[Requirement]string{RequiresNode: "20"}
			},
			want: `catalog server "alpha-ls" sets a minimum for "node", which has no version check`,
		},
		{
			name: "minimum with a minor version",
			mutate: func(c *Catalog) {
				beta(c).Minimums[RequiresJava] = "21.0"
			},
			want: `catalog server "beta-ls" minimum "21.0" for "java" is not a major version`,
		},
		{
			name: "zero minimum",
			mutate: func(c *Catalog) {
				beta(c).Minimums[RequiresJava] = "0"
			},
			want: `minimum "0" for "java" is not a major version`,
		},
		{
			name: "minimum that is not a number",
			mutate: func(c *Catalog) {
				beta(c).Minimums[RequiresJava] = "latest"
			},
			want: `minimum "latest" for "java" is not a major version`,
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			catalog := validCatalog()
			c.mutate(&catalog)
			err := catalog.Validate()
			if c.want == "" {
				if err != nil {
					t.Fatalf("Validate() = %v, want nil", err)
				}
				return
			}
			if err == nil || !strings.Contains(err.Error(), c.want) {
				t.Fatalf("Validate() = %v, want an error containing %q", err, c.want)
			}
		})
	}
}

func TestCleanPath(t *testing.T) {
	cases := []struct {
		value string
		want  string
		ok    bool
	}{
		{value: "bin", want: "bin", ok: true},
		{value: "libexec/bin/tool", want: "libexec/bin/tool", ok: true},
		{value: "./bin", want: "bin", ok: true},
		{value: "bin/", want: "bin", ok: true},
		{value: "bin//tool", want: "bin/tool", ok: true},
		{value: "lib/../bin", want: "bin", ok: true},
		{value: "..data", want: "..data", ok: true},
		{value: ""},
		{value: "."},
		{value: "./"},
		{value: ".."},
		{value: "../bin"},
		{value: "bin/../.."},
		{value: "bin/../../tool"},
		{value: "/usr/bin"},
		{value: `bin\tool`},
		{value: `..\tool`},
		{value: "C:/tools"},
		{value: "tool:latest"},
	}
	for _, c := range cases {
		t.Run(c.value, func(t *testing.T) {
			got, ok := CleanPath(c.value)
			if got != c.want || ok != c.ok {
				t.Fatalf("CleanPath(%q) = %q, %v, want %q, %v", c.value, got, ok, c.want, c.ok)
			}
		})
	}
}

func TestRunWithDataDir(t *testing.T) {
	cases := []struct {
		name        string
		run         Run
		wantArgs    []string
		wantOptions map[string]any
		wantUsed    bool
	}{
		{
			name:     "args",
			run:      Run{Bin: "jdtls", Args: []string{"-data", DataDirArgument, "--log=" + DataDirArgument + "/log"}},
			wantArgs: []string{"-data", "/data/jdtls", "--log=/data/jdtls/log"},
			wantUsed: true,
		},
		{
			name: "nested initialization options",
			run: Run{
				Bin:  "rust-analyzer",
				Args: []string{"--stdio"},
				InitializationOptions: map[string]any{
					"checkOnSave": false,
					"depth":       2.0,
					"cargo": map[string]any{
						"targetDir": DataDirArgument + "/target",
						"extraEnv":  []any{"CARGO_HOME=" + DataDirArgument, 1.0, map[string]any{"cache": DataDirArgument}},
					},
				},
			},
			wantArgs: []string{"--stdio"},
			wantOptions: map[string]any{
				"checkOnSave": false,
				"depth":       2.0,
				"cargo": map[string]any{
					"targetDir": "/data/jdtls/target",
					"extraEnv":  []any{"CARGO_HOME=/data/jdtls", 1.0, map[string]any{"cache": "/data/jdtls"}},
				},
			},
			wantUsed: true,
		},
		{
			name: "options without the placeholder",
			run: Run{
				Bin:                   "typescript-language-server",
				Args:                  []string{"--stdio"},
				InitializationOptions: map[string]any{"tsserver": map[string]any{"useSyntaxServer": "never"}},
			},
			wantArgs:    []string{"--stdio"},
			wantOptions: map[string]any{"tsserver": map[string]any{"useSyntaxServer": "never"}},
		},
		{
			name: "no args and no options",
			run:  Run{Bin: "gopls"},
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			originalArgs := slices.Clone(c.run.Args)
			resolved, used := c.run.WithDataDir("/data/jdtls")
			if used != c.wantUsed {
				t.Fatalf("used = %v, want %v", used, c.wantUsed)
			}
			if resolved.Bin != c.run.Bin {
				t.Fatalf("bin = %q, want %q", resolved.Bin, c.run.Bin)
			}
			if !slices.Equal(resolved.Args, c.wantArgs) {
				t.Fatalf("args = %q, want %q", resolved.Args, c.wantArgs)
			}
			if !reflect.DeepEqual(resolved.InitializationOptions, c.wantOptions) {
				t.Fatalf("initialization options = %v, want %v", resolved.InitializationOptions, c.wantOptions)
			}
			if !slices.Equal(c.run.Args, originalArgs) {
				t.Fatalf("original args changed to %q", c.run.Args)
			}
		})
	}
}

func TestRunWithDataDirKeepsTheOriginalOptions(t *testing.T) {
	run := Run{
		Bin:                   "rust-analyzer",
		InitializationOptions: map[string]any{"cargo": map[string]any{"targetDir": DataDirArgument + "/target"}},
	}
	if _, used := run.WithDataDir("/data"); !used {
		t.Fatal("used = false, want true")
	}
	want := map[string]any{"cargo": map[string]any{"targetDir": DataDirArgument + "/target"}}
	if !reflect.DeepEqual(run.InitializationOptions, want) {
		t.Fatalf("original options = %v, want %v", run.InitializationOptions, want)
	}
}

func TestInstallRequirements(t *testing.T) {
	cases := []struct {
		name    string
		install Install
		want    []Requirement
	}{
		{
			name:    "npm",
			install: Install{Type: InstallNpm, Bins: map[string]Bin{"tool": {Kind: BinNpm, Path: "tool"}}},
			want:    []Requirement{RequiresNode, RequiresNpm},
		},
		{
			name:    "golang",
			install: Install{Type: InstallGolang, Bins: map[string]Bin{"tool": {Kind: BinGolang, Path: "tool"}}},
			want:    []Requirement{RequiresGo},
		},
		{
			name: "download with exec bins",
			install: Install{Type: InstallDownload, Platforms: map[Platform]Download{
				PlatformDarwinArm64: {Bins: map[string]Bin{"tool": {Kind: BinExec, Path: "bin/tool"}}},
			}},
		},
		{
			name: "download with runners on different platforms",
			install: Install{Type: InstallDownload, Platforms: map[Platform]Download{
				PlatformDarwinArm64: {Bins: map[string]Bin{"tool": {Kind: BinPython, Path: "bin/tool"}}},
				PlatformLinuxX64Gnu: {Bins: map[string]Bin{"tool": {Kind: BinJava, Path: "lib/tool.jar"}, "helper": {Kind: BinNode, Path: "lib/helper.js"}}},
				PlatformWindowsX64:  {Bins: map[string]Bin{"tool": {Kind: BinJava, Path: "lib/tool.jar"}}},
			}},
			want: []Requirement{RequiresJava, RequiresNode, RequiresPython},
		},
		{
			name: "download with a dotnet bin",
			install: Install{Type: InstallDownload, Platforms: map[Platform]Download{
				PlatformWindowsX64: {Bins: map[string]Bin{"tool": {Kind: BinDotnet, Path: "tool.dll"}}},
			}},
			want: []Requirement{RequiresDotnet},
		},
		{
			name:    "npm with a node bin",
			install: Install{Type: InstallNpm, Bins: map[string]Bin{"tool": {Kind: BinNode, Path: "node_modules/tool/cli.js"}}},
			want:    []Requirement{RequiresNode, RequiresNpm},
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := c.install.Requirements(); !slices.Equal(got, c.want) {
				t.Fatalf("Requirements() = %q, want %q", got, c.want)
			}
		})
	}
}

func TestInstallAvailableOn(t *testing.T) {
	download := Download{Files: []File{{Name: "tool.zip"}}}
	cases := []struct {
		name     string
		install  Install
		platform Platform
		want     bool
	}{
		{name: "npm on any platform", install: Install{Type: InstallNpm}, platform: PlatformWindowsArm64, want: true},
		{name: "golang on any platform", install: Install{Type: InstallGolang}, platform: PlatformLinuxX64Musl, want: true},
		{name: "npm without a platform", install: Install{Type: InstallNpm}, platform: ""},
		{name: "download on a listed platform", install: Install{Type: InstallDownload, Platforms: map[Platform]Download{PlatformDarwinArm64: download}}, platform: PlatformDarwinArm64, want: true},
		{name: "download on an unlisted platform", install: Install{Type: InstallDownload, Platforms: map[Platform]Download{PlatformDarwinArm64: download}}, platform: PlatformDarwinX64},
		{name: "download without a platform", install: Install{Type: InstallDownload, Platforms: map[Platform]Download{"": download}}, platform: ""},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := c.install.AvailableOn(c.platform); got != c.want {
				t.Fatalf("AvailableOn(%q) = %v, want %v", c.platform, got, c.want)
			}
		})
	}
}

func TestInstallDownloadFor(t *testing.T) {
	darwin := Download{Files: []File{{Name: "darwin.zip"}}}
	linux := Download{Files: []File{{Name: "linux.zip"}}}
	install := Install{Type: InstallDownload, Platforms: map[Platform]Download{PlatformDarwinArm64: darwin, PlatformLinuxX64Gnu: linux}}
	got, ok := install.DownloadFor(PlatformLinuxX64Gnu)
	if !ok || !reflect.DeepEqual(got, linux) {
		t.Fatalf("DownloadFor(linux-x64-gnu) = %v, %v, want %v, true", got, ok, linux)
	}
	if got, ok := install.DownloadFor(PlatformWindowsX64); ok {
		t.Fatalf("DownloadFor(win32-x64) = %v, true, want false", got)
	}
}

func TestCatalogFileTypeOf(t *testing.T) {
	catalog := Catalog{FileTypes: map[string]FileType{
		"go":          {Extensions: []string{"go"}, Server: "gopls"},
		"go.mod":      {Filenames: []string{"go.mod"}, Server: "gopls"},
		"modula":      {Extensions: []string{"mod"}, Server: "modula-ls"},
		"shellscript": {Extensions: []string{"sh"}, Filenames: []string{".bashrc"}, Server: "bash-language-server"},
		"cpp":         {Extensions: []string{"c++"}, Server: "clangd"},
	}}
	cases := []struct {
		file string
		want string
	}{
		{file: "main.go", want: "go"},
		{file: "cmd/oversee/main.go", want: "go"},
		{file: "go.mod", want: "go.mod"},
		{file: "tools/go.mod", want: "go.mod"},
		{file: "lib/module.mod", want: "modula"},
		{file: "home/.bashrc", want: "shellscript"},
		{file: "scripts/run.sh", want: "shellscript"},
		{file: "src/vector.c++", want: "cpp"},
		{file: "Makefile"},
		{file: "archive.tar.gz"},
		{file: "main.go/README"},
		{file: "MAIN.GO"},
		{file: "main."},
	}
	for _, c := range cases {
		t.Run(c.file, func(t *testing.T) {
			got, ok := catalog.FileTypeOf(c.file)
			if got != c.want || ok != (c.want != "") {
				t.Fatalf("FileTypeOf(%q) = %q, %v, want %q", c.file, got, ok, c.want)
			}
		})
	}
}

func TestCatalogServer(t *testing.T) {
	catalog := validCatalog()
	server, ok := catalog.Server("beta-ls")
	if !ok || server.ID != "beta-ls" || server.Version != "2.0.0" {
		t.Fatalf("Server(beta-ls) = %v, %v", server.ID, ok)
	}
	if _, ok := catalog.Server("gamma-ls"); ok {
		t.Fatal("Server(gamma-ls) found, want missing")
	}
}

func TestBinKindRunner(t *testing.T) {
	cases := []struct {
		kind BinKind
		want Requirement
	}{
		{kind: BinNode, want: RequiresNode},
		{kind: BinPython, want: RequiresPython},
		{kind: BinJava, want: RequiresJava},
		{kind: BinDotnet, want: RequiresDotnet},
		{kind: BinExec},
		{kind: BinNpm},
		{kind: BinGolang},
	}
	for _, c := range cases {
		t.Run(string(c.kind), func(t *testing.T) {
			got, ok := c.kind.Runner()
			if got != c.want || ok != (c.want != "") {
				t.Fatalf("Runner() = %q, %v, want %q", got, ok, c.want)
			}
		})
	}
}

func TestEmbeddedCatalogIsValid(t *testing.T) {
	catalog, err := Embedded()
	if err != nil {
		t.Fatalf("Embedded() = %v", err)
	}
	if catalog.SchemaVersion != SchemaVersion || catalog.MasonRelease == "" {
		t.Fatalf("Embedded() schema version %d, mason release %q", catalog.SchemaVersion, catalog.MasonRelease)
	}
	if len(catalog.Servers) == 0 || len(catalog.FileTypes) == 0 {
		t.Fatalf("Embedded() has %d servers and %d file types", len(catalog.Servers), len(catalog.FileTypes))
	}
	for _, server := range catalog.Servers {
		if !slices.ContainsFunc(Platforms, server.Install.AvailableOn) {
			t.Errorf("server %s is available on no platform", server.ID)
		}
	}
}
