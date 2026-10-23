package cataloggen

import (
	"maps"
	"reflect"
	"slices"
	"strings"
	"testing"

	"github.com/obsfx/oversee/internal/catalog"
)

const testMasonRelease = "2026-10-20-test"

type registryPackage = map[string]any

func previousCatalog(t *testing.T) catalog.Catalog {
	t.Helper()
	curated, err := LoadCuratedServers()
	if err != nil {
		t.Fatalf("LoadCuratedServers() = %v", err)
	}
	servers := make([]catalog.Server, 0, len(curated))
	for _, id := range slices.Sorted(maps.Keys(curated)) {
		servers = append(servers, curated[id].Apply(catalog.Server{
			ID:      id,
			Version: "v0.0.1",
			Install: catalog.Install{
				Type:    catalog.InstallGolang,
				Package: "example.com/previous/" + id,
				Version: "v0.0.1",
				Bins:    map[string]catalog.Bin{curated[id].Run.Bin: {Kind: catalog.BinDotnet, Path: "previous/" + id + ".dll"}},
			},
		}))
	}
	previous := catalog.Catalog{SchemaVersion: catalog.SchemaVersion, MasonRelease: "previous", FileTypes: curated.FileTypes(), Servers: servers}
	if err := previous.Validate(); err != nil {
		t.Fatalf("previous catalog: %v", err)
	}
	return previous
}

func withoutServer(previous catalog.Catalog, id string) catalog.Catalog {
	previous.Servers = slices.DeleteFunc(slices.Clone(previous.Servers), func(server catalog.Server) bool {
		return server.ID == id
	})
	return previous
}

func runGenerator(t *testing.T, web *fakeWeb, previous catalog.Catalog) (catalog.Catalog, Report, error) {
	t.Helper()
	return NewGenerator(web.github(testToken), previous, discardLogger()).Generate(t.Context())
}

func serverOf(t *testing.T, generated catalog.Catalog, id string) catalog.Server {
	t.Helper()
	server, ok := generated.Server(id)
	if !ok {
		t.Fatalf("generated catalog has no %s", id)
	}
	return server
}

func assertWarnings(t *testing.T, report Report, wants ...string) {
	t.Helper()
	for _, want := range wants {
		if !slices.ContainsFunc(report.Warnings, func(warning string) bool {
			return strings.Contains(warning, want)
		}) {
			t.Errorf("warnings %q have none containing %q", report.Warnings, want)
		}
	}
}

func zlsPackage() registryPackage {
	return registryPackage{
		"name": "zls",
		"source": map[string]any{
			"id": "pkg:github/zigtools/zls@0.14.0",
			"asset": []any{
				map[string]any{"target": "darwin_arm64", "file": "zls-aarch64-macos.tar.xz", "bin": "zls"},
				map[string]any{"target": "linux_x64_gnu", "file": "zls-x86_64-linux.tar.xz"},
				map[string]any{"target": "win_x64", "file": "zls-x86_64-windows.zip", "bin": "zls.exe"},
			},
		},
		"bin": map[string]any{"zls": "{{source.asset.bin}}"},
	}
}

func TestGeneratorKeepsThePreviousEntry(t *testing.T) {
	cases := []struct {
		name     string
		packages []registryPackage
		warnings []string
	}{
		{
			name:     "server not in the registry",
			warnings: []string{"pyright: kept version v0.0.1: not in the mason registry", "zls: kept version v0.0.1: not in the mason registry"},
		},
		{
			name: "unsupported source",
			packages: []registryPackage{
				{"name": "pyright", "source": map[string]any{"id": "pkg:pypi/pyright@2.0.0"}},
			},
			warnings: []string{`pyright: kept version v0.0.1: unsupported source type "pypi"`},
		},
		{
			name: "invalid bin",
			packages: []registryPackage{
				{"name": "pyright", "source": map[string]any{"id": "pkg:npm/pyright@2.0.0"}, "bin": map[string]any{"pyright-langserver": "npm:dist/pyright-langserver"}},
			},
			warnings: []string{`pyright: kept version v0.0.1: bin pyright-langserver: npm bin "dist/pyright-langserver" is not a plain name`},
		},
		{
			name: "run bin missing from the new version",
			packages: []registryPackage{
				{"name": "pyright", "source": map[string]any{"id": "pkg:npm/pyright@2.0.0"}, "bin": map[string]any{"pyright": "npm:pyright"}},
			},
			warnings: []string{`pyright: kept version v0.0.1: catalog server "pyright" runs "pyright-langserver", which is not one of its bins`},
		},
		{
			name:     "no download with a checksum",
			packages: []registryPackage{zlsPackage()},
			warnings: []string{
				"zls: darwin-arm64 dropped: release zigtools/zls@0.14.0",
				"zls: win32-x64 dropped: release zigtools/zls@0.14.0",
				"zls: kept version v0.0.1: no download with a checksum",
			},
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			web := newFakeWeb()
			serveMasonRegistry(t, web, testMasonRelease, c.packages)
			previous := previousCatalog(t)

			generated, report, err := runGenerator(t, web, previous)
			if err != nil {
				t.Fatalf("Generate() = %v", err)
			}
			if !reflect.DeepEqual(generated.Servers, previous.Servers) {
				t.Fatalf("Generate() servers = %+v, want the previous %+v", generated.Servers, previous.Servers)
			}
			assertWarnings(t, report, c.warnings...)
		})
	}
}

func TestGeneratorFailsWithoutAPreviousEntry(t *testing.T) {
	cases := []struct {
		name     string
		id       string
		packages []registryPackage
		want     string
	}{
		{
			name: "server not in the registry",
			id:   "zls",
			want: "zls: not in the mason registry",
		},
		{
			name:     "unsupported source",
			id:       "pyright",
			packages: []registryPackage{{"name": "pyright", "source": map[string]any{"id": "pkg:pypi/pyright@2.0.0"}}},
			want:     `pyright: unsupported source type "pypi"`,
		},
		{
			name:     "no download with a checksum",
			id:       "zls",
			packages: []registryPackage{zlsPackage()},
			want:     "zls: no download with a checksum",
		},
		{
			name: "invalid server",
			id:   "pyright",
			packages: []registryPackage{
				{"name": "pyright", "source": map[string]any{"id": "pkg:npm/pyright@2.0.0"}, "bin": map[string]any{"pyright": "npm:pyright"}},
			},
			want: `pyright: catalog server "pyright" runs "pyright-langserver", which is not one of its bins`,
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			web := newFakeWeb()
			serveMasonRegistry(t, web, testMasonRelease, c.packages)

			_, _, err := runGenerator(t, web, withoutServer(previousCatalog(t), c.id))
			if err == nil || !strings.Contains(err.Error(), c.want) {
				t.Fatalf("Generate() = %v, want an error containing %q", err, c.want)
			}
		})
	}
}

func TestGeneratorResolvesRegistryPackages(t *testing.T) {
	const (
		zlsRelease  = "https://github.com/zigtools/zls/releases/download/0.14.0/"
		jdtlsURL    = "https://download.eclipse.org/jdtls/milestones/1.40.0/jdt-language-server.tar.gz"
		lombokURL   = "https://projectlombok.org/downloads/lombok.jar"
		jdtlsLatest = `https://download.eclipse.org/jdtls/milestones/{{ version | strip_prefix "v" }}/jdt-language-server.tar.gz`
	)
	darwinDigest := sha256Hex([]byte("zls darwin"))
	web := newFakeWeb()
	serveMasonRegistry(t, web, testMasonRelease, []registryPackage{
		{
			"name":        "gopls",
			"description": "Go language\n  server.",
			"source":      map[string]any{"id": "pkg:golang/golang.org/x/tools@v0.30.0#gopls"},
			"bin":         map[string]any{"gopls": "golang:gopls"},
		},
		{
			"name":        "bash-language-server",
			"deprecation": map[string]any{"message": "use bashls"},
			"source":      map[string]any{"id": "pkg:npm/bash-language-server@5.4.0"},
			"bin":         map[string]any{"bash-language-server": "npm:bash-language-server"},
		},
		zlsPackage(),
		{
			"name": "jdtls",
			"source": map[string]any{
				"id":       "pkg:generic/eclipse/eclipse.jdt.ls@v1.40.0",
				"download": map[string]any{"files": map[string]any{"jdtls.tar.gz": jdtlsLatest, "lombok.jar": lombokURL}},
			},
			"bin": map[string]any{"jdtls": "python:bin/jdtls"},
		},
		{"name": "not-curated", "source": map[string]any{"id": "pkg:npm/not-curated@1.0.0"}},
	})
	web.serveRelease(t, "zigtools/zls", Release{Tag: "0.14.0", Assets: []ReleaseAsset{
		{Name: "zls-aarch64-macos.tar.xz", Digest: "sha256:" + darwinDigest},
		{Name: "zls-x86_64-windows.zip"},
	}})
	web.serve(zlsRelease+"zls-x86_64-windows.zip", []byte("zls windows"))
	web.serve(jdtlsURL, []byte("jdtls archive"))
	previous := previousCatalog(t)
	curated, err := LoadCuratedServers()
	if err != nil {
		t.Fatalf("LoadCuratedServers() = %v", err)
	}

	generated, report, err := runGenerator(t, web, previous)
	if err != nil {
		t.Fatalf("Generate() = %v", err)
	}

	if generated.SchemaVersion != catalog.SchemaVersion || generated.MasonRelease != testMasonRelease {
		t.Fatalf("Generate() schema %d, mason release %q", generated.SchemaVersion, generated.MasonRelease)
	}
	if !reflect.DeepEqual(generated.FileTypes, curated.FileTypes()) {
		t.Fatalf("Generate() file types = %v, want %v", generated.FileTypes, curated.FileTypes())
	}
	if report.MasonRelease != testMasonRelease || !reflect.DeepEqual(report.Servers, generated.Servers) {
		t.Fatalf("report %s with %d servers, want the generated ones", report.MasonRelease, len(report.Servers))
	}

	wantGopls := curated["gopls"].Apply(catalog.Server{
		ID:          "gopls",
		Description: "Go language server.",
		Version:     "v0.30.0",
		Install: catalog.Install{
			Type:    catalog.InstallGolang,
			Package: "golang.org/x/tools/gopls",
			Version: "v0.30.0",
			Bins:    map[string]catalog.Bin{"gopls": {Kind: catalog.BinGolang, Path: "gopls"}},
		},
	})
	if got := serverOf(t, generated, "gopls"); !reflect.DeepEqual(got, wantGopls) {
		t.Errorf("gopls = %+v, want %+v", got, wantGopls)
	}

	if got := serverOf(t, generated, "bash-language-server"); got.Version != "5.4.0" || got.Install.Package != "bash-language-server" {
		t.Errorf("bash-language-server = %+v, want version 5.4.0", got)
	}

	wantZls := curated["zls"].Apply(catalog.Server{
		ID:      "zls",
		Version: "0.14.0",
		Install: catalog.Install{
			Type:    catalog.InstallDownload,
			Package: "zigtools/zls",
			Version: "0.14.0",
			Platforms: map[catalog.Platform]catalog.Download{
				catalog.PlatformDarwinArm64: {
					Files: []catalog.File{{URL: zlsRelease + "zls-aarch64-macos.tar.xz", SHA256: darwinDigest, Name: "zls-aarch64-macos.tar.xz"}},
					Bins:  map[string]catalog.Bin{"zls": {Kind: catalog.BinExec, Path: "zls"}},
				},
				catalog.PlatformWindowsX64: {
					Files: []catalog.File{{URL: zlsRelease + "zls-x86_64-windows.zip", SHA256: sha256Hex([]byte("zls windows")), Name: "zls-x86_64-windows.zip"}},
					Bins:  map[string]catalog.Bin{"zls": {Kind: catalog.BinExec, Path: "zls.exe"}},
				},
			},
		},
	})
	if got := serverOf(t, generated, "zls"); !reflect.DeepEqual(got, wantZls) {
		t.Errorf("zls = %+v, want %+v", got, wantZls)
	}

	jdtlsDownload := catalog.Download{
		Files: []catalog.File{{URL: jdtlsURL, SHA256: sha256Hex([]byte("jdtls archive")), Name: "jdtls.tar.gz"}},
		Bins:  map[string]catalog.Bin{"jdtls": {Kind: catalog.BinPython, Path: "bin/jdtls"}},
	}
	jdtlsPlatforms := map[catalog.Platform]catalog.Download{}
	for _, platform := range catalog.Platforms {
		jdtlsPlatforms[platform] = jdtlsDownload
	}
	wantJdtls := curated["jdtls"].Apply(catalog.Server{
		ID:      "jdtls",
		Version: "v1.40.0",
		Install: catalog.Install{Type: catalog.InstallDownload, Package: "eclipse/eclipse.jdt.ls", Version: "v1.40.0", Platforms: jdtlsPlatforms},
	})
	if got := serverOf(t, generated, "jdtls"); !reflect.DeepEqual(got, wantJdtls) {
		t.Errorf("jdtls = %+v, want %+v", got, wantJdtls)
	}

	for _, id := range []string{"clangd", "pyright", "typescript-language-server"} {
		want, _ := previous.Server(id)
		if got := serverOf(t, generated, id); !reflect.DeepEqual(got, want) {
			t.Errorf("%s = %+v, want the previous %+v", id, got, want)
		}
	}
	if _, ok := generated.Server("not-curated"); ok {
		t.Error("generated catalog has not-curated, a server outside servers.json")
	}

	assertWarnings(t, report,
		"bash-language-server: deprecated in mason: use bashls",
		`zls: linux-x64-gnu skipped: bin zls: template "{{source.asset.bin}}"`,
		"clangd: kept version v0.0.1: not in the mason registry",
	)
	for _, warning := range report.Warnings {
		if strings.HasPrefix(warning, "gopls:") || strings.HasPrefix(warning, "jdtls:") {
			t.Errorf("unexpected warning %q", warning)
		}
	}
	if requests := web.requestsTo(lombokURL); len(requests) != 0 {
		t.Errorf("skipped file %s downloaded %d times", lombokURL, len(requests))
	}
	if requests := web.requestsTo(zlsRelease + "zls-aarch64-macos.tar.xz"); len(requests) != 0 {
		t.Errorf("file with a release digest downloaded %d times", len(requests))
	}
}

func TestReportWriteTo(t *testing.T) {
	servers := []catalog.Server{
		{ID: "gopls", Version: "v0.30.0", Install: catalog.Install{Type: catalog.InstallGolang}},
		{ID: "zls", Version: "0.14.0", Install: catalog.Install{Type: catalog.InstallDownload, Platforms: map[catalog.Platform]catalog.Download{
			catalog.PlatformDarwinArm64: {},
			catalog.PlatformWindowsX64:  {},
		}}},
	}
	table := "## Language server catalog\n\n" +
		"mason release `" + testMasonRelease + "`\n\n" +
		"| server | version | install | platforms |\n" +
		"| --- | --- | --- | --- |\n" +
		"| gopls | v0.30.0 | golang | all |\n" +
		"| zls | 0.14.0 | download | all but darwin-x64, linux-arm64-gnu, linux-x64-gnu, linux-arm64-musl, linux-x64-musl, win32-arm64 |\n"
	cases := []struct {
		name   string
		report Report
		want   string
	}{
		{
			name:   "without warnings",
			report: Report{MasonRelease: testMasonRelease, Servers: servers},
			want:   table,
		},
		{
			name: "with warnings",
			report: Report{MasonRelease: testMasonRelease, Servers: servers, Warnings: []string{
				"zls: linux-x64-gnu skipped: no bin",
				"pyright: kept version 1.1.400: not in the mason registry",
			}},
			want: table + "\nwarnings:\n\n" +
				"- zls: linux-x64-gnu skipped: no bin\n" +
				"- pyright: kept version 1.1.400: not in the mason registry\n",
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			var output strings.Builder
			written, err := c.report.WriteTo(&output)
			if err != nil {
				t.Fatalf("WriteTo() = %v", err)
			}
			if output.String() != c.want {
				t.Fatalf("WriteTo() wrote\n%s\nwant\n%s", output.String(), c.want)
			}
			if written != int64(len(c.want)) {
				t.Fatalf("WriteTo() = %d bytes, want %d", written, len(c.want))
			}
		})
	}
}

func TestReportWarn(t *testing.T) {
	var report Report
	report.warn("zls", "first")
	report.warn("gopls", "second")
	if want := []string{"zls: first", "gopls: second"}; !slices.Equal(report.Warnings, want) {
		t.Fatalf("warnings = %q, want %q", report.Warnings, want)
	}
}
