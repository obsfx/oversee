package cataloggen

import (
	"maps"
	"reflect"
	"slices"
	"strings"
	"testing"

	"github.com/obsfx/oversee/internal/catalog"
)

func withCuratedSource(t *testing.T, source string) {
	t.Helper()
	original := curatedSource
	curatedSource = []byte(source)
	t.Cleanup(func() {
		curatedSource = original
	})
}

func TestLoadCuratedServers(t *testing.T) {
	servers, err := LoadCuratedServers()
	if err != nil {
		t.Fatalf("LoadCuratedServers() = %v", err)
	}
	want := []string{
		"bash-language-server", "clangd", "gopls", "intelephense", "jdtls", "kotlin-language-server",
		"lua-language-server", "omnisharp", "pyright", "rust-analyzer", "typescript-language-server", "zls",
	}
	if got := slices.Sorted(maps.Keys(servers)); !slices.Equal(got, want) {
		t.Fatalf("curated servers = %v, want %v", got, want)
	}
	jdtls := servers["jdtls"]
	if !slices.Equal(jdtls.SkipFiles, []string{"lombok.jar"}) || jdtls.Minimums[catalog.RequiresJava] != "21" || !slices.Equal(jdtls.Run.Args, []string{"-data", catalog.DataDirArgument}) {
		t.Fatalf("jdtls = %+v", jdtls)
	}
	wantOptions := map[string]any{"checkOnSave": false, "cargo": map[string]any{"targetDir": catalog.DataDirArgument + "/target"}}
	if got := servers["rust-analyzer"].Run.InitializationOptions; !reflect.DeepEqual(got, wantOptions) {
		t.Fatalf("rust-analyzer initialization options = %v, want %v", got, wantOptions)
	}
}

func TestLoadCuratedServersRejectsUnknownMembers(t *testing.T) {
	cases := []struct {
		name   string
		source string
	}{
		{name: "server member", source: `{"acme-ls": {"run": {"bin": "acme-ls"}, "skipFile": ["x.jar"]}}`},
		{name: "member with another case", source: `{"acme-ls": {"run": {"bin": "acme-ls"}, "SkipFiles": ["x.jar"]}}`},
		{name: "run member", source: `{"acme-ls": {"run": {"bin": "acme-ls", "argv": ["--stdio"]}}}`},
		{name: "file type member", source: `{"acme-ls": {"fileTypes": {"acme": {"extension": ["ac"]}}, "run": {"bin": "acme-ls"}}}`},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			withCuratedSource(t, c.source)
			servers, err := LoadCuratedServers()
			if err == nil || !strings.Contains(err.Error(), "decode curated servers") {
				t.Fatalf("LoadCuratedServers() = %v, %v, want a decode error", servers, err)
			}
		})
	}
	t.Run("known members", func(t *testing.T) {
		withCuratedSource(t, `{"acme-ls": {"fileTypes": {"acme": {"extensions": ["ac"], "filenames": ["Acmefile"]}}, "rootMarkers": ["acme.json"], "run": {"bin": "acme-ls", "args": ["--stdio"]}, "requires": ["java"], "minimums": {"java": "17"}, "skipFiles": ["x.jar"]}}`)
		servers, err := LoadCuratedServers()
		if err != nil {
			t.Fatalf("LoadCuratedServers() = %v", err)
		}
		want := CuratedServers{"acme-ls": {
			FileTypes:   map[string]CuratedFileType{"acme": {Extensions: []string{"ac"}, Filenames: []string{"Acmefile"}}},
			RootMarkers: []string{"acme.json"},
			Run:         catalog.Run{Bin: "acme-ls", Args: []string{"--stdio"}},
			Requires:    []catalog.Requirement{catalog.RequiresJava},
			Minimums:    map[catalog.Requirement]string{catalog.RequiresJava: "17"},
			SkipFiles:   []string{"x.jar"},
		}}
		if !reflect.DeepEqual(servers, want) {
			t.Fatalf("LoadCuratedServers() = %+v, want %+v", servers, want)
		}
	})
}

func TestCuratedServersFileTypes(t *testing.T) {
	servers := CuratedServers{
		"gopls": {FileTypes: map[string]CuratedFileType{
			"go":     {Extensions: []string{"go"}},
			"go.mod": {Filenames: []string{"go.mod"}},
		}},
		"bash-language-server": {FileTypes: map[string]CuratedFileType{
			"shellscript": {Extensions: []string{"sh", "bash"}, Filenames: []string{".bashrc"}},
		}},
	}
	want := map[string]catalog.FileType{
		"go":          {Extensions: []string{"go"}, Server: "gopls"},
		"go.mod":      {Filenames: []string{"go.mod"}, Server: "gopls"},
		"shellscript": {Extensions: []string{"sh", "bash"}, Filenames: []string{".bashrc"}, Server: "bash-language-server"},
	}
	if got := servers.FileTypes(); !reflect.DeepEqual(got, want) {
		t.Fatalf("FileTypes() = %+v, want %+v", got, want)
	}
}

func TestCuratedServerApply(t *testing.T) {
	curated := CuratedServer{
		FileTypes: map[string]CuratedFileType{
			"zeta":  {Extensions: []string{"zt"}},
			"alpha": {Extensions: []string{"al"}},
		},
		RootMarkers: []string{"acme.json"},
		Run:         catalog.Run{Bin: "acme-ls", Args: []string{"--stdio"}},
		Requires:    []catalog.Requirement{catalog.RequiresJava, catalog.RequiresNode},
		Minimums:    map[catalog.Requirement]string{catalog.RequiresJava: "21"},
	}
	install := catalog.Install{
		Type:    catalog.InstallNpm,
		Package: "acme-ls",
		Version: "2.0.0",
		Bins:    map[string]catalog.Bin{"acme-ls": {Kind: catalog.BinNpm, Path: "acme-ls"}},
	}
	server := catalog.Server{
		ID:          "acme-ls",
		Description: "Acme language server",
		Homepage:    "https://example.com/acme-ls",
		Version:     "2.0.0",
		FileTypes:   []string{"old"},
		RootMarkers: []string{"old.json"},
		Run:         catalog.Run{Bin: "old-ls"},
		Install:     install,
		Requires:    []catalog.Requirement{catalog.RequiresPython},
		Minimums:    map[catalog.Requirement]string{catalog.RequiresPython: "3"},
	}
	want := catalog.Server{
		ID:          "acme-ls",
		Description: "Acme language server",
		Homepage:    "https://example.com/acme-ls",
		Version:     "2.0.0",
		FileTypes:   []string{"alpha", "zeta"},
		RootMarkers: []string{"acme.json"},
		Run:         catalog.Run{Bin: "acme-ls", Args: []string{"--stdio"}},
		Install:     install,
		Requires:    []catalog.Requirement{catalog.RequiresJava, catalog.RequiresNode, catalog.RequiresNpm},
		Minimums:    map[catalog.Requirement]string{catalog.RequiresJava: "21"},
	}
	if got := curated.Apply(server); !reflect.DeepEqual(got, want) {
		t.Fatalf("Apply() = %+v, want %+v", got, want)
	}
}

func TestCuratedServerResolve(t *testing.T) {
	curated := CuratedServer{
		FileTypes: map[string]CuratedFileType{"java": {Extensions: []string{"java"}}},
		Run:       catalog.Run{Bin: "jdtls"},
		Requires:  []catalog.Requirement{catalog.RequiresJava},
		Minimums:  map[catalog.Requirement]string{catalog.RequiresJava: "21"},
		SkipFiles: []string{"lombok.jar"},
	}
	bins := map[string]catalog.Bin{"jdtls": {Kind: catalog.BinPython, Path: "bin/jdtls"}}
	download := func() catalog.Download {
		return catalog.Download{
			Files: []catalog.File{
				{URL: "https://projectlombok.org/downloads/lombok.jar", Name: "lombok.jar", Dest: "lib"},
				{URL: "https://download.eclipse.org/jdtls/jdtls.tar.gz", Name: "jdtls.tar.gz"},
				{URL: "https://example.com/lombok.jar.sig", Name: "lombok.jar.sig"},
			},
			Bins: bins,
		}
	}
	resolution := Resolution{Install: catalog.Install{
		Type:    catalog.InstallDownload,
		Package: "eclipse/eclipse.jdt.ls",
		Version: "v1.40.0",
		Platforms: map[catalog.Platform]catalog.Download{
			catalog.PlatformDarwinArm64: download(),
			catalog.PlatformLinuxX64Gnu: download(),
		},
	}}
	pkg := MasonPackage{
		Name:        "jdtls",
		Description: "Java language server.\n\n   Runs on   the JVM.  ",
		Homepage:    "https://github.com/eclipse-jdtls/eclipse.jdt.ls",
		Licenses:    []string{"EPL-2.0"},
		Languages:   []string{"Java"},
	}
	got := curated.Resolve("jdtls", pkg, resolution)

	kept := catalog.Download{
		Files: []catalog.File{
			{URL: "https://download.eclipse.org/jdtls/jdtls.tar.gz", Name: "jdtls.tar.gz"},
			{URL: "https://example.com/lombok.jar.sig", Name: "lombok.jar.sig"},
		},
		Bins: bins,
	}
	want := catalog.Server{
		ID:          "jdtls",
		Description: "Java language server. Runs on the JVM.",
		Homepage:    "https://github.com/eclipse-jdtls/eclipse.jdt.ls",
		Licenses:    []string{"EPL-2.0"},
		Languages:   []string{"Java"},
		Version:     "v1.40.0",
		FileTypes:   []string{"java"},
		Run:         catalog.Run{Bin: "jdtls"},
		Install: catalog.Install{
			Type:    catalog.InstallDownload,
			Package: "eclipse/eclipse.jdt.ls",
			Version: "v1.40.0",
			Platforms: map[catalog.Platform]catalog.Download{
				catalog.PlatformDarwinArm64: kept,
				catalog.PlatformLinuxX64Gnu: kept,
			},
		},
		Requires: []catalog.Requirement{catalog.RequiresJava, catalog.RequiresPython},
		Minimums: map[catalog.Requirement]string{catalog.RequiresJava: "21"},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("Resolve() = %+v, want %+v", got, want)
	}
}

func TestShippedCatalogMatchesCuratedServers(t *testing.T) {
	shipped, err := catalog.Embedded()
	if err != nil {
		t.Fatalf("Embedded() = %v", err)
	}
	curated, err := LoadCuratedServers()
	if err != nil {
		t.Fatalf("LoadCuratedServers() = %v", err)
	}
	if !reflect.DeepEqual(shipped.FileTypes, curated.FileTypes()) {
		t.Fatalf("shipped file types = %v, want %v", shipped.FileTypes, curated.FileTypes())
	}
	ids := make([]string, 0, len(shipped.Servers))
	for _, server := range shipped.Servers {
		ids = append(ids, server.ID)
		if applied := curated[server.ID].Apply(server); !reflect.DeepEqual(applied, server) {
			t.Errorf("shipped %s differs from servers.json: %+v, want %+v", server.ID, server, applied)
		}
	}
	if want := slices.Sorted(maps.Keys(curated)); !slices.Equal(ids, want) {
		t.Fatalf("shipped servers = %v, want %v", ids, want)
	}
}
