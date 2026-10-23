package domain

import (
	"fmt"
	"strings"
)

type LanguageServerStatus string

const (
	LanguageServerNotInstalled LanguageServerStatus = "not-installed"
	LanguageServerInstalling   LanguageServerStatus = "installing"
	LanguageServerInstalled    LanguageServerStatus = "installed"
	LanguageServerFailed       LanguageServerStatus = "failed"
)

type LanguageServerState struct {
	ID               string
	CatalogVersion   string
	InstalledVersion string
	Installing       bool
	Progress         InstallProgress
	Failure          string
	Available        bool
	Missing          []MissingTool
}

type MissingTool struct {
	Tool    string
	Minimum string
	Found   string
}

func (m MissingTool) Outdated() bool {
	return m.Minimum != ""
}

func (m MissingTool) String() string {
	if !m.Outdated() {
		return m.Tool
	}
	return m.Tool + " " + m.Minimum + " or newer"
}

type InstallProgress struct {
	Received int64
	Total    int64
}

func (p InstallProgress) Known() bool {
	return p.Received > 0 || p.Total > 0
}

func (s LanguageServerState) Status() LanguageServerStatus {
	switch {
	case s.Installing:
		return LanguageServerInstalling
	case s.Failure != "":
		return LanguageServerFailed
	case s.InstalledVersion != "":
		return LanguageServerInstalled
	default:
		return LanguageServerNotInstalled
	}
}

func (s LanguageServerState) UpdateAvailable() bool {
	return s.InstalledVersion != "" && s.InstalledVersion != s.CatalogVersion
}

func (s LanguageServerState) Installable() error {
	if !s.Available {
		return fmt.Errorf("%w: %s has no build for this platform", ErrLanguageServerUnavailable, s.ID)
	}
	if len(s.Missing) > 0 {
		tools := make([]string, 0, len(s.Missing))
		for _, missing := range s.Missing {
			tools = append(tools, missing.String())
		}
		return fmt.Errorf("%w: %s needs %s", ErrLanguageServerUnavailable, s.ID, strings.Join(tools, ", "))
	}
	return nil
}
