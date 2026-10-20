package dto

import (
	"encoding/json/jsontext"
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
	ID               string   `json:"id"`
	Description      string   `json:"description"`
	Homepage         string   `json:"homepage"`
	Languages        []string `json:"languages"`
	FileTypes        []string `json:"fileTypes"`
	Version          string   `json:"version"`
	Requires         []string `json:"requires"`
	Missing          []string `json:"missing"`
	Available        bool     `json:"available"`
	Status           string   `json:"status"`
	InstalledVersion string   `json:"installedVersion"`
	UpdateAvailable  bool     `json:"updateAvailable"`
	Error            string   `json:"error"`
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
	return LanguageServer{
		ID:               entry.Server.ID,
		Description:      entry.Server.Description,
		Homepage:         entry.Server.Homepage,
		Languages:        entry.Server.Languages,
		FileTypes:        entry.Server.FileTypes,
		Version:          entry.Server.Version,
		Requires:         requires,
		Missing:          entry.State.Missing,
		Available:        entry.State.Available,
		Status:           string(entry.State.Status()),
		InstalledVersion: entry.State.InstalledVersion,
		UpdateAvailable:  entry.State.UpdateAvailable(),
		Error:            entry.State.Failure,
	}
}

func LanguageServersChangedOf(at time.Time) Envelope {
	return Envelope{Kind: languageServersChangedKind, Payload: jsontext.Value("{}"), CreatedAt: millis(at)}
}
