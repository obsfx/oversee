package cataloggen

import (
	"archive/zip"
	"bytes"
	"encoding/json/v2"
	"reflect"
	"strings"
	"testing"
)

const (
	masonLatestURL   = "https://api.github.com/repos/mason-org/mason-registry/releases/latest"
	masonDownloadURL = "https://github.com/mason-org/mason-registry/releases/download/"
)

func zipOf(t *testing.T, name string, content []byte) []byte {
	t.Helper()
	var archive bytes.Buffer
	writer := zip.NewWriter(&archive)
	file, err := writer.Create(name)
	if err != nil {
		t.Fatalf("zip %s: %v", name, err)
	}
	if _, err := file.Write(content); err != nil {
		t.Fatalf("zip %s: %v", name, err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("zip %s: %v", name, err)
	}
	return archive.Bytes()
}

func checksumsOf(entries ...string) []byte {
	var text strings.Builder
	for index := 0; index+1 < len(entries); index += 2 {
		text.WriteString(entries[index] + "  " + entries[index+1] + "\n")
	}
	return []byte(text.String())
}

func serveMasonRelease(t *testing.T, web *fakeWeb, tag string, checksums, archive []byte) {
	t.Helper()
	release := Release{Tag: tag}
	if checksums != nil {
		release.Assets = append(release.Assets, ReleaseAsset{Name: masonChecksums, DownloadURL: masonDownloadURL + tag + "/" + masonChecksums})
		web.serve(masonDownloadURL+tag+"/"+masonChecksums, checksums)
	}
	release.Assets = append(release.Assets, ReleaseAsset{Name: masonArchiveName, DownloadURL: masonDownloadURL + tag + "/" + masonArchiveName})
	web.serve(masonDownloadURL+tag+"/"+masonArchiveName, archive)
	web.serveJSON(t, masonLatestURL, release)
}

func serveMasonRegistry(t *testing.T, web *fakeWeb, tag string, packages any) {
	t.Helper()
	registry, err := json.Marshal(packages)
	if err != nil {
		t.Fatalf("encode registry: %v", err)
	}
	archive := zipOf(t, masonRegistryName, registry)
	serveMasonRelease(t, web, tag, checksumsOf(sha256Hex(archive), masonArchiveName, sha256Hex(registry), masonRegistryName), archive)
}

func TestLoadMasonRegistry(t *testing.T) {
	asset := []any{map[string]any{"target": "darwin_arm64", "file": "zls-aarch64-macos.tar.xz", "bin": "zls"}}
	web := newFakeWeb()
	serveMasonRegistry(t, web, "2026-10-20-test", []MasonPackage{
		{Name: "gopls", Source: MasonSource{ID: "pkg:golang/golang.org/x/tools@v0.30.0#gopls"}, Bin: map[string]string{"gopls": "golang:gopls"}},
		{
			Name:        "zls",
			Description: "Zig LSP implementation.",
			Languages:   []string{"Zig"},
			Deprecation: &masonDeprecation{Message: "moved"},
			Source:      MasonSource{ID: "pkg:github/zigtools/zls@0.14.0", Asset: asset},
			Bin:         map[string]string{"zls": "{{source.asset.bin}}"},
		},
	})
	registry, err := LoadMasonRegistry(t.Context(), web.github(testToken))
	if err != nil {
		t.Fatalf("LoadMasonRegistry() = %v", err)
	}
	if registry.Release != "2026-10-20-test" || len(registry.Packages) != 2 {
		t.Fatalf("registry %s with %d packages", registry.Release, len(registry.Packages))
	}
	zls, ok := registry.Package("zls")
	if !ok {
		t.Fatal("Package(zls) not found")
	}
	if zls.Source.ID != "pkg:github/zigtools/zls@0.14.0" || zls.Description != "Zig LSP implementation." || zls.Deprecation == nil || zls.Deprecation.Message != "moved" {
		t.Fatalf("Package(zls) = %+v", zls)
	}
	if !reflect.DeepEqual(zls.Source.Asset, asset) {
		t.Fatalf("zls asset = %v, want %v", zls.Source.Asset, asset)
	}
	if !reflect.DeepEqual(zls.Bin, map[string]string{"zls": "{{source.asset.bin}}"}) {
		t.Fatalf("zls bin = %v", zls.Bin)
	}
	if _, ok := registry.Package("pyright"); ok {
		t.Fatal("Package(pyright) found, want missing")
	}
}

func TestLoadMasonRegistryRejects(t *testing.T) {
	registry := []byte(`[{"name": "gopls", "source": {"id": "pkg:golang/golang.org/x/tools@v0.30.0#gopls"}}]`)
	archive := zipOf(t, masonRegistryName, registry)
	cases := []struct {
		name      string
		checksums []byte
		archive   []byte
		skipServe bool
		want      string
	}{
		{
			name:      "no release",
			skipServe: true,
			want:      "mason registry release",
		},
		{
			name:    "no checksums asset",
			archive: archive,
			want:    "has no checksums.txt",
		},
		{
			name:      "archive checksum mismatch",
			checksums: checksumsOf(sha256Hex([]byte("other")), masonArchiveName, sha256Hex(registry), masonRegistryName),
			archive:   archive,
			want:      "registry.json.zip checksum " + sha256Hex(archive) + " does not match",
		},
		{
			name:      "registry checksum mismatch",
			checksums: checksumsOf(sha256Hex(archive), masonArchiveName, sha256Hex([]byte("other")), masonRegistryName),
			archive:   archive,
			want:      "registry.json checksum " + sha256Hex(registry) + " does not match",
		},
		{
			name:      "archive missing from the checksums",
			checksums: checksumsOf(sha256Hex(registry), masonRegistryName),
			archive:   archive,
			want:      "checksums have no entry for registry.json.zip",
		},
		{
			name:      "registry missing from the checksums",
			checksums: checksumsOf(sha256Hex(archive), masonArchiveName),
			archive:   archive,
			want:      "checksums have no entry for registry.json",
		},
		{
			name:      "archive that is not a zip",
			checksums: checksumsOf(sha256Hex([]byte("not a zip")), masonArchiveName),
			archive:   []byte("not a zip"),
			want:      "open registry.json.zip",
		},
		{
			name:      "archive without the registry",
			checksums: checksumsOf(sha256Hex(zipOf(t, "other.json", registry)), masonArchiveName, sha256Hex(registry), masonRegistryName),
			archive:   zipOf(t, "other.json", registry),
			want:      "open registry.json in registry.json.zip",
		},
		{
			name:      "registry that is not json",
			checksums: checksumsOf(sha256Hex(zipOf(t, masonRegistryName, []byte("{"))), masonArchiveName, sha256Hex([]byte("{")), masonRegistryName),
			archive:   zipOf(t, masonRegistryName, []byte("{")),
			want:      "decode mason registry",
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			web := newFakeWeb()
			if !c.skipServe {
				serveMasonRelease(t, web, "2026-10-20-test", c.checksums, c.archive)
			}
			registry, err := LoadMasonRegistry(t.Context(), web.github(testToken))
			if err == nil || !strings.Contains(err.Error(), c.want) {
				t.Fatalf("LoadMasonRegistry() = %d packages, %v, want an error containing %q", len(registry.Packages), err, c.want)
			}
		})
	}
}

func TestParseChecksums(t *testing.T) {
	content := []byte("aaaa  registry.json.zip\n\nbbbb  registry.json\r\nnot a checksum line\ncccc\n")
	want := checksumList{"registry.json.zip": "aaaa", "registry.json": "bbbb"}
	if got := parseChecksums(content); !reflect.DeepEqual(got, want) {
		t.Fatalf("parseChecksums() = %v, want %v", got, want)
	}
}

func TestChecksumListVerify(t *testing.T) {
	content := []byte("registry")
	sums := checksumList{"registry.json": sha256Hex(content), "other.json": sha256Hex([]byte("other"))}
	if err := sums.Verify("registry.json", content); err != nil {
		t.Fatalf("Verify(registry.json) = %v", err)
	}
	if err := sums.Verify("other.json", content); err == nil || !strings.Contains(err.Error(), "does not match") {
		t.Fatalf("Verify(other.json) = %v, want a mismatch", err)
	}
	if err := sums.Verify("missing.json", content); err == nil || !strings.Contains(err.Error(), "checksums have no entry for missing.json") {
		t.Fatalf("Verify(missing.json) = %v, want a missing entry", err)
	}
}
