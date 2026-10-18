package domain

import "path/filepath"

type WorkspaceInfo struct {
	Name     string
	RepoName string
	Path     string
}

func NewWorkspaceInfo(dir, repoRoot string) WorkspaceInfo {
	info := WorkspaceInfo{Name: filepath.Base(dir), Path: dir}
	if filepath.Clean(dir) != filepath.Clean(repoRoot) {
		info.RepoName = filepath.Base(repoRoot)
	}
	return info
}
