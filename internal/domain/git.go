package domain

import "bytes"

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

type Blob []byte

func (b Blob) Exists() bool {
	return b != nil
}

func (b Blob) IsBinary() bool {
	return bytes.IndexByte(b, 0) >= 0
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
