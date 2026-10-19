package dto

import "github.com/obsfx/oversee/internal/domain"

type BranchList struct {
	Branches       []string `json:"branches"`
	RemoteBranches []string `json:"remoteBranches"`
	Current        string   `json:"current"`
}

func BranchListOf(list domain.BranchList) BranchList {
	return BranchList{Branches: list.Local, RemoteBranches: list.Remote, Current: list.Current}
}

type Change struct {
	Path         string `json:"path"`
	PreviousPath string `json:"previousPath,omitempty"`
	Status       string `json:"status"`
	Additions    int    `json:"additions"`
	Deletions    int    `json:"deletions"`
	Revision     string `json:"revision"`
}

type FileTree struct {
	Paths   []string `json:"paths"`
	Changes []Change `json:"changes"`
}

func FileTreeOf(tree domain.FileTree) FileTree {
	changes := make([]Change, 0, len(tree.Changes))
	for _, change := range tree.Changes {
		changes = append(changes, Change{
			Path:         change.Path,
			PreviousPath: change.PreviousPath,
			Status:       string(change.Status),
			Additions:    change.Additions,
			Deletions:    change.Deletions,
			Revision:     change.Revision,
		})
	}
	return FileTree{Paths: tree.Paths, Changes: changes}
}

type FileContents struct {
	Name     string `json:"name"`
	Contents string `json:"contents"`
}

type FileDiff struct {
	Binary  bool          `json:"binary"`
	OldFile *FileContents `json:"oldFile"`
	NewFile *FileContents `json:"newFile"`
}

func FileDiffOf(diff domain.FileDiff) FileDiff {
	return FileDiff{Binary: diff.Binary, OldFile: fileContentsOf(diff.OldFile), NewFile: fileContentsOf(diff.NewFile)}
}

func fileContentsOf(contents *domain.FileContents) *FileContents {
	if contents == nil {
		return nil
	}
	return &FileContents{Name: contents.Name, Contents: contents.Contents}
}
