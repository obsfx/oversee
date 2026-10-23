package dto

import (
	"time"

	"github.com/obsfx/oversee/internal/service"
)

const languageServersChangedKind = "language-servers.changed"

type LanguageServerList struct {
	Platform  string                            `json:"platform"`
	FileTypes map[string]LanguageServerFileType `json:"fileTypes"`
	Servers   []LanguageServer                  `json:"servers"`
}

type LanguageServerFileType struct {
	Extensions []string `json:"extensions"`
	Filenames  []string `json:"filenames"`
	Server     string   `json:"server"`
}

type LanguageServer struct {
	ID               string                  `json:"id"`
	Description      string                  `json:"description"`
	Homepage         string                  `json:"homepage"`
	Languages        []string                `json:"languages"`
	FileTypes        []string                `json:"fileTypes"`
	Version          string                  `json:"version"`
	Requires         []string                `json:"requires"`
	Missing          []string                `json:"missing"`
	Outdated         []OutdatedTool          `json:"outdated"`
	Available        bool                    `json:"available"`
	Status           string                  `json:"status"`
	Progress         *LanguageServerProgress `json:"progress"`
	InstalledVersion string                  `json:"installedVersion"`
	UpdateAvailable  bool                    `json:"updateAvailable"`
	Error            string                  `json:"error"`
}

type OutdatedTool struct {
	Tool    string `json:"tool"`
	Minimum string `json:"minimum"`
	Found   string `json:"found"`
}

type LanguageServerProgress struct {
	Received int64 `json:"received"`
	Total    int64 `json:"total"`
}

func LanguageServerListOf(list service.LanguageServerList) LanguageServerList {
	fileTypes := make(map[string]LanguageServerFileType, len(list.FileTypes))
	for name, fileType := range list.FileTypes {
		fileTypes[name] = LanguageServerFileType{Extensions: fileType.Extensions, Filenames: fileType.Filenames, Server: fileType.Server}
	}
	servers := make([]LanguageServer, 0, len(list.Servers))
	for _, entry := range list.Servers {
		servers = append(servers, LanguageServerOf(entry))
	}
	return LanguageServerList{Platform: string(list.Platform), FileTypes: fileTypes, Servers: servers}
}

func LanguageServerOf(entry service.LanguageServerEntry) LanguageServer {
	requires := make([]string, 0, len(entry.Server.Requires))
	for _, requirement := range entry.Server.Requires {
		requires = append(requires, string(requirement))
	}
	missing := make([]string, 0, len(entry.State.Missing))
	outdated := make([]OutdatedTool, 0)
	for _, tool := range entry.State.Missing {
		missing = append(missing, tool.Tool)
		if tool.Outdated() {
			outdated = append(outdated, OutdatedTool{Tool: tool.Tool, Minimum: tool.Minimum, Found: tool.Found})
		}
	}
	var progress *LanguageServerProgress
	if entry.State.Installing && entry.State.Progress.Known() {
		progress = &LanguageServerProgress{Received: entry.State.Progress.Received, Total: entry.State.Progress.Total}
	}
	return LanguageServer{
		ID:               entry.Server.ID,
		Description:      entry.Server.Description,
		Homepage:         entry.Server.Homepage,
		Languages:        entry.Server.Languages,
		FileTypes:        entry.Server.FileTypes,
		Version:          entry.Server.Version,
		Requires:         requires,
		Missing:          missing,
		Outdated:         outdated,
		Available:        entry.State.Available,
		Status:           string(entry.State.Status()),
		Progress:         progress,
		InstalledVersion: entry.State.InstalledVersion,
		UpdateAvailable:  entry.State.UpdateAvailable(),
		Error:            entry.State.Failure,
	}
}

func LanguageServersChangedOf(at time.Time) (Envelope, error) {
	return signalOf(languageServersChangedKind, struct{}{}, at)
}
