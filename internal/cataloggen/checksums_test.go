package cataloggen

import (
	"errors"
	"io"
	"log"
	"maps"
	"reflect"
	"slices"
	"strings"
	"testing"

	"github.com/obsfx/oversee/internal/catalog"
)

func discardLogger() *log.Logger {
	return log.New(io.Discard, "", 0)
}

func catalogWithFiles(files ...catalog.File) catalog.Catalog {
	return catalog.Catalog{Servers: []catalog.Server{{
		ID: "tool",
		Install: catalog.Install{
			Type:      catalog.InstallDownload,
			Platforms: map[catalog.Platform]catalog.Download{catalog.PlatformDarwinArm64: {Files: files}},
		},
	}}}
}

func TestGitHubReleaseFile(t *testing.T) {
	cases := []struct {
		link     string
		wantKey  releaseKey
		wantName string
		wantOK   bool
	}{
		{
			link:     "https://github.com/zigtools/zls/releases/download/0.14.0/zls-aarch64-macos.tar.xz",
			wantKey:  releaseKey{repository: "zigtools/zls", tag: "0.14.0"},
			wantName: "zls-aarch64-macos.tar.xz",
			wantOK:   true,
		},
		{
			link:     "https://github.com/acme/tool/releases/download/v1.0.0/tool%20build%2B1.zip",
			wantKey:  releaseKey{repository: "acme/tool", tag: "v1.0.0"},
			wantName: "tool build+1.zip",
			wantOK:   true,
		},
		{
			link:     "https://github.com/acme/tool/releases/download/nightly/2026/tool.zip",
			wantKey:  releaseKey{repository: "acme/tool", tag: "nightly/2026"},
			wantName: "tool.zip",
			wantOK:   true,
		},
		{link: "https://github.com/acme/tool/archive/refs/tags/v1.0.0.zip"},
		{link: "https://github.com/acme/tool/releases/download/v1.0.0"},
		{link: "https://github.com/acme/tool/releases/download/v1.0.0/tool%zz.zip"},
		{link: "http://github.com/acme/tool/releases/download/v1.0.0/tool.zip"},
		{link: "https://objects.githubusercontent.com/acme/tool/releases/download/v1.0.0/tool.zip"},
		{link: "https://download.eclipse.org/jdtls/milestones/1.40.0/jdt-language-server-1.40.0.tar.gz"},
	}
	for _, c := range cases {
		t.Run(c.link, func(t *testing.T) {
			key, name, ok := githubReleaseFile(c.link)
			if key != c.wantKey || name != c.wantName || ok != c.wantOK {
				t.Fatalf("githubReleaseFile() = %+v, %q, %v, want %+v, %q, %v", key, name, ok, c.wantKey, c.wantName, c.wantOK)
			}
		})
	}
}

func TestNewChecksumResolverCachesOnlyGitHubReleaseFiles(t *testing.T) {
	const (
		release  = "https://github.com/acme/tool/releases/download/v1.0.0/tool.zip"
		archive  = "https://github.com/acme/tool/archive/refs/tags/v1.0.0.zip"
		external = "https://download.example.com/tool.tar.gz"
	)
	previous := catalogWithFiles(
		catalog.File{URL: release, SHA256: sha256Hex([]byte("release"))},
		catalog.File{URL: archive, SHA256: sha256Hex([]byte("archive"))},
		catalog.File{URL: external, SHA256: sha256Hex([]byte("external"))},
	)
	resolver := NewChecksumResolver(newFakeWeb().github(testToken), previous, discardLogger())
	want := map[string]string{release: sha256Hex([]byte("release"))}
	if !reflect.DeepEqual(resolver.known, want) {
		t.Fatalf("known = %v, want %v", resolver.known, want)
	}
}

func TestChecksumResolverResolve(t *testing.T) {
	const (
		release       = "https://github.com/acme/tool/releases/download/v1.0.0/"
		digested      = release + "digested.zip"
		cached        = release + "cached.zip"
		hashed        = release + "hashed.zip"
		missingAsset  = release + "missing.zip"
		goneRelease   = "https://github.com/acme/gone/releases/download/v2.0.0/gone.zip"
		external      = "https://download.example.com/tool.tar.gz"
		missingExtern = "https://download.example.com/missing.tar.gz"
	)
	digestedSum := sha256Hex([]byte("digested"))
	cachedSum := sha256Hex([]byte("cached"))
	staleSum := sha256Hex([]byte("stale"))

	web := newFakeWeb()
	web.serveRelease(t, "acme/tool", Release{Tag: "v1.0.0", Assets: []ReleaseAsset{
		{Name: "digested.zip", Digest: "sha256:" + digestedSum},
		{Name: "cached.zip"},
		{Name: "hashed.zip", Digest: "md5:0123"},
	}})
	web.serve(cached, []byte("cached download"))
	web.serve(hashed, []byte("hashed"))
	web.serve(external, []byte("external"))
	previous := catalogWithFiles(
		catalog.File{URL: digested, SHA256: staleSum},
		catalog.File{URL: cached, SHA256: cachedSum},
		catalog.File{URL: external, SHA256: staleSum},
	)
	resolver := NewChecksumResolver(web.github(testToken), previous, discardLogger())

	result := resolver.Resolve(t.Context(), []string{digested, cached, hashed, missingAsset, goneRelease, external, missingExtern})

	wantSums := map[string]string{
		digested: digestedSum,
		cached:   cachedSum,
		hashed:   sha256Hex([]byte("hashed")),
		external: sha256Hex([]byte("external")),
	}
	if !reflect.DeepEqual(result.Sums, wantSums) {
		t.Fatalf("sums = %v, want %v", result.Sums, wantSums)
	}
	wantFailures := map[string]string{
		missingAsset:  "release v1.0.0 has no asset missing.zip",
		goneRelease:   "release acme/gone@v2.0.0",
		missingExtern: "status 404 Not Found",
	}
	if got := slices.Sorted(maps.Keys(result.Failures)); !slices.Equal(got, slices.Sorted(maps.Keys(wantFailures))) {
		t.Fatalf("failures for %v, want %v", got, slices.Sorted(maps.Keys(wantFailures)))
	}
	for link, want := range wantFailures {
		if err := result.Failures[link]; !strings.Contains(err.Error(), want) {
			t.Errorf("failure for %s = %v, want %q", link, err, want)
		}
	}
	for _, link := range []string{digested, cached, missingAsset, goneRelease} {
		if requests := web.requestsTo(link); len(requests) != 0 {
			t.Errorf("%s downloaded %d times, want 0", link, len(requests))
		}
	}
	for _, link := range []string{hashed, external} {
		if requests := web.requestsTo(link); len(requests) != 1 {
			t.Errorf("%s downloaded %d times, want 1", link, len(requests))
		}
	}
	if requests := web.requestsTo("https://api.github.com/repos/acme/tool/releases/tags/v1.0.0"); len(requests) != 1 {
		t.Errorf("release acme/tool@v1.0.0 looked up %d times, want 1", len(requests))
	}
}

func TestChecksumResultSign(t *testing.T) {
	failure := errors.New("release lookup failed")
	result := ChecksumResult{
		Sums:     map[string]string{"https://example.com/a.zip": "aaaa", "https://example.com/b.zip": "bbbb"},
		Failures: map[string]error{"https://example.com/failed.zip": failure},
	}
	t.Run("every file has a checksum", func(t *testing.T) {
		files := []catalog.File{
			{URL: "https://example.com/b.zip", Name: "b.zip", Dest: "lib"},
			{URL: "https://example.com/a.zip", Name: "a.zip"},
		}
		got, err := result.Sign(files)
		if err != nil {
			t.Fatalf("Sign() = %v", err)
		}
		want := []catalog.File{
			{URL: "https://example.com/b.zip", Name: "b.zip", Dest: "lib", SHA256: "bbbb"},
			{URL: "https://example.com/a.zip", Name: "a.zip", SHA256: "aaaa"},
		}
		if !reflect.DeepEqual(got, want) {
			t.Fatalf("Sign() = %+v, want %+v", got, want)
		}
		if files[0].SHA256 != "" {
			t.Fatalf("Sign() changed its input to %+v", files[0])
		}
	})
	t.Run("a file failed", func(t *testing.T) {
		_, err := result.Sign([]catalog.File{{URL: "https://example.com/a.zip"}, {URL: "https://example.com/failed.zip"}})
		if !errors.Is(err, failure) {
			t.Fatalf("Sign() = %v, want %v", err, failure)
		}
	})
	t.Run("a file was never resolved", func(t *testing.T) {
		_, err := result.Sign([]catalog.File{{URL: "https://example.com/unknown.zip"}})
		if err == nil || err.Error() != "no checksum for https://example.com/unknown.zip" {
			t.Fatalf("Sign() = %v, want a missing checksum", err)
		}
	})
}
