package dto

import "github.com/obsfx/oversee/internal/domain"

type Workspace struct {
	Name     string `json:"name"`
	RepoName string `json:"repoName,omitempty"`
	Path     string `json:"path"`
}

func WorkspaceOf(info domain.WorkspaceInfo) Workspace {
	return Workspace{Name: info.Name, RepoName: info.RepoName, Path: info.Path}
}

type Globals struct {
	BaseURL   string    `json:"baseUrl"`
	WSURL     string    `json:"wsUrl"`
	Workspace Workspace `json:"workspace"`
}

type Error struct {
	Error string `json:"error"`
}
