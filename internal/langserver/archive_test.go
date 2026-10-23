package langserver

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"compress/gzip"
	"errors"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/ulikunitz/xz"
)

type archiveEntry struct {
	name string
	body string
	mode fs.FileMode
	link string
}

func dirEntry(name string) archiveEntry {
	return archiveEntry{name: name, mode: fs.ModeDir | 0o755}
}

func fileEntry(name, body string, perm fs.FileMode) archiveEntry {
	return archiveEntry{name: name, body: body, mode: perm}
}

func linkEntry(name, target string) archiveEntry {
	return archiveEntry{name: name, mode: fs.ModeSymlink | 0o777, link: target}
}

type archiveFormat struct {
	extension string
	build     func(t *testing.T, entries []archiveEntry) []byte
}

var archiveFormats = []archiveFormat{
	{extension: ".zip", build: zipArchive},
	{extension: ".vsix", build: zipArchive},
	{extension: ".tar.gz", build: gzipTarArchive},
	{extension: ".tgz", build: gzipTarArchive},
	{extension: ".tar.xz", build: xzTarArchive},
}

func zipArchive(t *testing.T, entries []archiveEntry) []byte {
	t.Helper()
	var buffer bytes.Buffer
	writer := zip.NewWriter(&buffer)
	for _, entry := range entries {
		header := &zip.FileHeader{Name: entry.name, Method: zip.Deflate}
		header.SetMode(entry.mode)
		content, err := writer.CreateHeader(header)
		if err != nil {
			t.Fatal(err)
		}
		body := entry.body
		if entry.mode&fs.ModeSymlink != 0 {
			body = entry.link
		}
		if _, err := io.WriteString(content, body); err != nil {
			t.Fatal(err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	return buffer.Bytes()
}

func tarArchive(t *testing.T, out io.Writer, entries []archiveEntry) {
	t.Helper()
	writer := tar.NewWriter(out)
	for _, entry := range entries {
		header := &tar.Header{Name: entry.name, Mode: int64(entry.mode.Perm())}
		switch {
		case entry.mode.IsDir():
			header.Typeflag = tar.TypeDir
		case entry.mode&fs.ModeSymlink != 0:
			header.Typeflag = tar.TypeSymlink
			header.Linkname = entry.link
		default:
			header.Typeflag = tar.TypeReg
			header.Size = int64(len(entry.body))
		}
		if err := writer.WriteHeader(header); err != nil {
			t.Fatal(err)
		}
		if _, err := io.WriteString(writer, entry.body); err != nil {
			t.Fatal(err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
}

func gzipTarArchive(t *testing.T, entries []archiveEntry) []byte {
	t.Helper()
	var buffer bytes.Buffer
	compressor := gzip.NewWriter(&buffer)
	tarArchive(t, compressor, entries)
	if err := compressor.Close(); err != nil {
		t.Fatal(err)
	}
	return buffer.Bytes()
}

func xzTarArchive(t *testing.T, entries []archiveEntry) []byte {
	t.Helper()
	var buffer bytes.Buffer
	compressor, err := xz.NewWriter(&buffer)
	if err != nil {
		t.Fatal(err)
	}
	tarArchive(t, compressor, entries)
	if err := compressor.Close(); err != nil {
		t.Fatal(err)
	}
	return buffer.Bytes()
}

func gzipBytes(t *testing.T, content string) []byte {
	t.Helper()
	var buffer bytes.Buffer
	compressor := gzip.NewWriter(&buffer)
	if _, err := io.WriteString(compressor, content); err != nil {
		t.Fatal(err)
	}
	if err := compressor.Close(); err != nil {
		t.Fatal(err)
	}
	return buffer.Bytes()
}

type extraction struct {
	base    string
	install string
	archive string
}

func newExtraction(t *testing.T, name string, content []byte) extraction {
	t.Helper()
	base := t.TempDir()
	install := filepath.Join(base, "install")
	if err := os.Mkdir(install, 0o755); err != nil {
		t.Fatal(err)
	}
	archive := filepath.Join(install, name)
	if err := os.WriteFile(archive, content, 0o644); err != nil {
		t.Fatal(err)
	}
	return extraction{base: base, install: install, archive: archive}
}

func (e extraction) path(name string) string {
	return filepath.Join(e.install, filepath.FromSlash(name))
}

func readText(t *testing.T, path string) string {
	t.Helper()
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	return string(content)
}

func requireMissing(t *testing.T, path string) {
	t.Helper()
	if _, err := os.Lstat(path); !errors.Is(err, fs.ErrNotExist) {
		t.Errorf("%s exists (err %v), want it missing", path, err)
	}
}

func skipWithoutUnixModes(t *testing.T) {
	t.Helper()
	if runtime.GOOS == "windows" {
		t.Skip("windows has no unix file modes or unprivileged symlinks")
	}
}

func TestExtractArchiveFormats(t *testing.T) {
	skipWithoutUnixModes(t)
	entries := []archiveEntry{
		dirEntry("bin/"),
		fileEntry("bin/server", "#!/bin/sh\n", 0o755),
		fileEntry("lib/data.txt", "data", 0o644),
		fileEntry("lib/no-mode", "plain", 0),
		fileEntry("share/deep/nested/file.txt", "nested", 0o644),
		linkEntry("bin/latest", "./sub/../server"),
		linkEntry("bin/data", "../lib/data.txt"),
	}
	for _, format := range archiveFormats {
		t.Run(format.extension, func(t *testing.T) {
			extracted := newExtraction(t, "server"+format.extension, format.build(t, entries))
			if err := extractArchive(extracted.archive); err != nil {
				t.Fatalf("extractArchive: %v", err)
			}
			requireMissing(t, extracted.archive)
			files := map[string]string{
				"bin/server":                 "#!/bin/sh\n",
				"lib/data.txt":               "data",
				"lib/no-mode":                "plain",
				"share/deep/nested/file.txt": "nested",
				"bin/latest":                 "#!/bin/sh\n",
				"bin/data":                   "data",
			}
			for name, want := range files {
				if got := readText(t, extracted.path(name)); got != want {
					t.Errorf("%s = %q, want %q", name, got, want)
				}
			}
			links := map[string]string{"bin/latest": "server", "bin/data": filepath.Join("..", "lib", "data.txt")}
			for name, want := range links {
				got, err := os.Readlink(extracted.path(name))
				if err != nil {
					t.Fatalf("readlink %s: %v", name, err)
				}
				if got != want {
					t.Errorf("link %s -> %q, want the cleaned target %q", name, got, want)
				}
			}
			modes := []struct {
				name       string
				executable bool
			}{
				{name: "bin/server", executable: true},
				{name: "lib/data.txt", executable: false},
				{name: "lib/no-mode", executable: false},
			}
			for _, mode := range modes {
				info, err := os.Stat(extracted.path(mode.name))
				if err != nil {
					t.Fatal(err)
				}
				perm := info.Mode().Perm()
				if perm&0o600 != 0o600 {
					t.Errorf("%s mode %v, want the owner to read and write it", mode.name, perm)
				}
				if executable := perm&0o111 != 0; executable != mode.executable {
					t.Errorf("%s mode %v, executable = %t, want %t", mode.name, perm, executable, mode.executable)
				}
			}
		})
	}
}

func TestExtractArchiveRejectsEntriesLeavingTheInstallDirectory(t *testing.T) {
	skipWithoutUnixModes(t)
	names := []string{"../evil.txt", "lib/../../evil.txt", "/evil.txt"}
	for _, format := range archiveFormats {
		for _, name := range names {
			t.Run(format.extension+" "+name, func(t *testing.T) {
				extracted := newExtraction(t, "server"+format.extension, format.build(t, []archiveEntry{fileEntry(name, "evil", 0o644)}))
				err := extractArchive(extracted.archive)
				if err == nil || !strings.Contains(err.Error(), "leaves the install directory") {
					t.Fatalf("extractArchive error = %v, want an entry that leaves the install directory", err)
				}
				requireMissing(t, filepath.Join(extracted.base, "evil.txt"))
			})
		}
	}
}

func TestExtractArchiveRejectsUnsafeLinks(t *testing.T) {
	skipWithoutUnixModes(t)
	tests := []struct {
		name    string
		entries []archiveEntry
		link    string
		wantErr string
	}{
		{name: "absolute link", entries: []archiveEntry{linkEntry("bin/passwd", "/etc/passwd")}, link: "bin/passwd", wantErr: "points outside the install directory"},
		{name: "rooted link", entries: []archiveEntry{linkEntry("bin/root", "//etc")}, link: "bin/root", wantErr: "points outside the install directory"},
		{name: "link leaving the install directory", entries: []archiveEntry{linkEntry("bin/up", "../../outside")}, link: "bin/up", wantErr: "points outside the install directory"},
		{name: "link that leaves after cleaning", entries: []archiveEntry{linkEntry("bin/up", "lib/../../../outside")}, link: "bin/up", wantErr: "points outside the install directory"},
		{name: "top level link to the parent", entries: []archiveEntry{linkEntry("parent", "..")}, link: "parent", wantErr: "points outside the install directory"},
		{
			name:    "link created through another link",
			entries: []archiveEntry{dirEntry("real/"), linkEntry("alias", "real"), linkEntry("alias/inner", "file")},
			link:    "real/inner",
			wantErr: "is created through the link alias",
		},
	}
	for _, format := range archiveFormats {
		for _, test := range tests {
			t.Run(format.extension+" "+test.name, func(t *testing.T) {
				extracted := newExtraction(t, "server"+format.extension, format.build(t, test.entries))
				err := extractArchive(extracted.archive)
				if err == nil || !strings.Contains(err.Error(), test.wantErr) {
					t.Fatalf("extractArchive error = %v, want %q", err, test.wantErr)
				}
				requireMissing(t, extracted.path(test.link))
			})
		}
	}
}

func TestExtractArchiveWritesThroughTheInstallRoot(t *testing.T) {
	skipWithoutUnixModes(t)
	for _, format := range archiveFormats {
		t.Run(format.extension, func(t *testing.T) {
			extracted := newExtraction(t, "server"+format.extension, format.build(t, []archiveEntry{fileEntry("escape/payload.txt", "evil", 0o644)}))
			outside := filepath.Join(extracted.base, "outside")
			if err := os.Mkdir(outside, 0o755); err != nil {
				t.Fatal(err)
			}
			if err := os.Symlink(outside, extracted.path("escape")); err != nil {
				t.Fatal(err)
			}
			if err := extractArchive(extracted.archive); err == nil {
				t.Fatal("extractArchive wrote through a link that leaves the install directory")
			}
			requireMissing(t, filepath.Join(outside, "payload.txt"))
		})
	}
}

func TestExtractArchiveGunzipsSingleFiles(t *testing.T) {
	skipWithoutUnixModes(t)
	extracted := newExtraction(t, "rust-analyzer.gz", gzipBytes(t, "binary"))
	if err := extractArchive(extracted.archive); err != nil {
		t.Fatalf("extractArchive: %v", err)
	}
	requireMissing(t, extracted.archive)
	target := extracted.path("rust-analyzer")
	if got := readText(t, target); got != "binary" {
		t.Errorf("content = %q, want binary", got)
	}
	info, err := os.Stat(target)
	if err != nil {
		t.Fatal(err)
	}
	if info.Mode().Perm()&0o100 == 0 {
		t.Errorf("mode %v, want the owner to execute it", info.Mode().Perm())
	}
}

func TestExtractArchiveKeepsOtherFiles(t *testing.T) {
	extracted := newExtraction(t, "lombok.jar", []byte("jar"))
	if err := extractArchive(extracted.archive); err != nil {
		t.Fatalf("extractArchive: %v", err)
	}
	if got := readText(t, extracted.archive); got != "jar" {
		t.Errorf("content = %q, want the file untouched", got)
	}
}

func TestExtractArchiveReportsCorruptArchives(t *testing.T) {
	names := []string{"server.zip", "server.tar.gz", "server.tar.xz", "server.gz"}
	for _, name := range names {
		t.Run(name, func(t *testing.T) {
			extracted := newExtraction(t, name, []byte("not an archive"))
			err := extractArchive(extracted.archive)
			if err == nil || !strings.Contains(err.Error(), "extract "+name) {
				t.Fatalf("extractArchive error = %v, want an extract %s failure", err, name)
			}
		})
	}
}
