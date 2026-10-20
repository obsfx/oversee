package lsp

import (
	"encoding/json/jsontext"
	"encoding/json/v2"
	"fmt"
	"net/url"
	"path/filepath"
	"runtime"
	"strings"
)

type Position struct {
	Line      int `json:"line"`
	Character int `json:"character"`
}

type Range struct {
	Start Position `json:"start"`
	End   Position `json:"end"`
}

type Location struct {
	URI   string `json:"uri"`
	Range Range  `json:"range"`
}

type locationOrLink struct {
	URI                  string `json:"uri"`
	Range                Range  `json:"range"`
	TargetURI            string `json:"targetUri"`
	TargetRange          Range  `json:"targetRange"`
	TargetSelectionRange *Range `json:"targetSelectionRange"`
}

type FileChangeType int

const (
	FileChanged FileChangeType = 2
	FileDeleted FileChangeType = 3
)

type FileEvent struct {
	URI  string         `json:"uri"`
	Type FileChangeType `json:"type"`
}

type didChangeWatchedFilesParams struct {
	Changes []FileEvent `json:"changes"`
}

type textDocumentItem struct {
	URI        string `json:"uri"`
	LanguageID string `json:"languageId"`
	Version    int    `json:"version"`
	Text       string `json:"text"`
}

type textDocumentIdentifier struct {
	URI string `json:"uri"`
}

type didOpenParams struct {
	TextDocument textDocumentItem `json:"textDocument"`
}

type didCloseParams struct {
	TextDocument textDocumentIdentifier `json:"textDocument"`
}

type positionParams struct {
	TextDocument textDocumentIdentifier `json:"textDocument"`
	Position     Position               `json:"position"`
}

type workspaceFolder struct {
	URI  string `json:"uri"`
	Name string `json:"name"`
}

type initializeParams struct {
	ProcessID        int               `json:"processId"`
	ClientInfo       clientInfo        `json:"clientInfo"`
	RootURI          string            `json:"rootUri"`
	RootPath         string            `json:"rootPath"`
	WorkspaceFolders []workspaceFolder `json:"workspaceFolders"`
	Capabilities     jsontext.Value    `json:"capabilities"`
}

type clientInfo struct {
	Name string `json:"name"`
}

type progressParams struct {
	Token jsontext.Value `json:"token"`
	Value struct {
		Kind string `json:"kind"`
	} `json:"value"`
}

type configurationParams struct {
	Items []jsontext.Value `json:"items"`
}

var clientCapabilities = jsontext.Value(`{
	"general": {"positionEncodings": ["utf-16"]},
	"textDocument": {
		"synchronization": {"dynamicRegistration": false, "didSave": false},
		"definition": {"dynamicRegistration": false, "linkSupport": true}
	},
	"workspace": {"workspaceFolders": true, "configuration": true, "didChangeWatchedFiles": {"dynamicRegistration": true}},
	"window": {"workDoneProgress": true}
}`)

func FileEventOf(path string, exists bool) FileEvent {
	if exists {
		return FileEvent{URI: FileURI(path), Type: FileChanged}
	}
	return FileEvent{URI: FileURI(path), Type: FileDeleted}
}

func FileURI(path string) string {
	slashed := filepath.ToSlash(path)
	if !strings.HasPrefix(slashed, "/") {
		slashed = "/" + slashed
	}
	return (&url.URL{Scheme: "file", Path: slashed}).String()
}

func PathOf(uri string) (string, error) {
	parsed, err := url.Parse(uri)
	if err != nil {
		return "", err
	}
	if parsed.Scheme != "file" {
		return "", fmt.Errorf("%s is not a file uri", uri)
	}
	path := parsed.Path
	if runtime.GOOS == "windows" {
		path = strings.TrimPrefix(path, "/")
	}
	return filepath.FromSlash(path), nil
}

func parseLocations(raw jsontext.Value) ([]Location, error) {
	trimmed := strings.TrimSpace(string(raw))
	if trimmed == "" || trimmed == "null" {
		return nil, nil
	}
	var entries []locationOrLink
	if strings.HasPrefix(trimmed, "{") {
		var single locationOrLink
		if err := json.Unmarshal(raw, &single); err != nil {
			return nil, err
		}
		entries = []locationOrLink{single}
	} else if err := json.Unmarshal(raw, &entries); err != nil {
		return nil, err
	}
	locations := make([]Location, 0, len(entries))
	for _, entry := range entries {
		locations = append(locations, entry.location())
	}
	return locations, nil
}

func (l locationOrLink) location() Location {
	if l.TargetURI == "" {
		return Location{URI: l.URI, Range: l.Range}
	}
	if l.TargetSelectionRange != nil {
		return Location{URI: l.TargetURI, Range: *l.TargetSelectionRange}
	}
	return Location{URI: l.TargetURI, Range: l.TargetRange}
}
