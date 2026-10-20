package domain

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"slices"
	"strings"
)

const revisionBytes = 8

type BranchList struct {
	Local   []string
	Remote  []string
	Current string
}

type ChangeStatus string

const (
	ChangeAdded     ChangeStatus = "added"
	ChangeModified  ChangeStatus = "modified"
	ChangeDeleted   ChangeStatus = "deleted"
	ChangeRenamed   ChangeStatus = "renamed"
	ChangeUntracked ChangeStatus = "untracked"
)

type Change struct {
	Path         string
	PreviousPath string
	Status       ChangeStatus
	Additions    int
	Deletions    int
	Revision     string
}

func RevisionOf(source, target string) string {
	sum := sha256.Sum256([]byte(source + "\x00" + target))
	return hex.EncodeToString(sum[:revisionBytes])
}

func (c Change) File() FileRef {
	return FileRef{Path: c.Path, PreviousPath: c.PreviousPath}
}

type FileTree struct {
	Paths   []string
	Changes []Change
}

func NewFileTree(paths []string, changes []Change) FileTree {
	for _, change := range changes {
		if change.Status == ChangeDeleted {
			paths = append(paths, change.Path)
		}
	}
	return FileTree{Paths: paths, Changes: changes}
}

func (t FileTree) Find(path string) (Change, bool) {
	index := slices.IndexFunc(t.Changes, func(change Change) bool {
		return change.Path == path
	})
	if index < 0 {
		return Change{}, false
	}
	return t.Changes[index], true
}

type Blob []byte

func (b Blob) Exists() bool {
	return b != nil
}

func (b Blob) IsBinary() bool {
	return bytes.IndexByte(b, 0) >= 0
}

func (b Blob) Lines() ([]string, bool) {
	if !b.Exists() || b.IsBinary() {
		return nil, false
	}
	return strings.Split(string(b), "\n"), true
}

func (b Blob) Snippet(startLine, count int) Snippet {
	snippet := Snippet{StartLine: startLine + 1}
	lines, ok := b.Lines()
	if !ok || startLine < 0 || startLine >= len(lines) {
		return snippet
	}
	for _, line := range lines[startLine:min(startLine+count, len(lines))] {
		snippet.Lines = append(snippet.Lines, strings.TrimSuffix(line, "\r"))
	}
	return snippet
}

func (b Blob) Digest() string {
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:])
}

func (b Blob) LineCount() int {
	if len(b) == 0 || b.IsBinary() {
		return 0
	}
	count := bytes.Count(b, []byte("\n"))
	if !bytes.HasSuffix(b, []byte("\n")) {
		count++
	}
	return count
}

type FileContents struct {
	Name     string
	Contents string
}

type FileDiff struct {
	Binary  bool
	OldFile *FileContents
	NewFile *FileContents
}

func NewFileDiff(file FileRef, oldBlob, newBlob Blob) FileDiff {
	if oldBlob.IsBinary() || newBlob.IsBinary() {
		return FileDiff{Binary: true}
	}
	return FileDiff{
		OldFile: fileContentsOf(file.OldPath(), oldBlob),
		NewFile: fileContentsOf(file.Path, newBlob),
	}
}

func fileContentsOf(name string, blob Blob) *FileContents {
	if !blob.Exists() {
		return nil
	}
	return &FileContents{Name: name, Contents: string(blob)}
}
