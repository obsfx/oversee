package domain

import "path/filepath"

type DefinitionQuery struct {
	Comparison Comparison
	Side       FileSide
	Path       string
	Line       int
	Character  int
}

type DefinitionStatus string

const (
	DefinitionsReady         DefinitionStatus = "ready"
	DefinitionsUnsupported   DefinitionStatus = "unsupported"
	DefinitionsNotInstalled  DefinitionStatus = "not-installed"
	DefinitionsNeedsCheckout DefinitionStatus = "needs-checkout"
	DefinitionsStarting      DefinitionStatus = "starting"
	DefinitionsIndexing      DefinitionStatus = "indexing"
	DefinitionsFailed        DefinitionStatus = "failed"
)

type DefinitionLookup struct {
	Status      DefinitionStatus
	Server      string
	Error       string
	Definitions []Definition
}

type Definition struct {
	Path           string
	External       bool
	Side           FileSide
	StartLine      int
	StartCharacter int
	EndLine        int
	EndCharacter   int
	Snippet        Snippet
}

type Snippet struct {
	StartLine int
	Lines     []string
}

func (q DefinitionQuery) Validate() error {
	if err := q.Comparison.Validate(); err != nil {
		return err
	}
	if err := q.Side.Validate(); err != nil {
		return err
	}
	if q.Path == "" {
		return invalid("path", "is required")
	}
	if !filepath.IsLocal(filepath.FromSlash(q.Path)) {
		return invalid("path", "must stay inside the repository")
	}
	if q.Line < 1 {
		return invalid("line", "must be at least 1")
	}
	if q.Character < 0 {
		return invalid("character", "must not be negative")
	}
	return nil
}

func (q DefinitionQuery) OnWorkingTree(currentBranch string) bool {
	return q.Comparison.IsUncommitted() || q.Comparison.Source == currentBranch
}

func DefinitionsWith(status DefinitionStatus, server string) DefinitionLookup {
	return DefinitionLookup{Status: status, Server: server}
}

func DefinitionsFailure(server string, err error) DefinitionLookup {
	return DefinitionLookup{Status: DefinitionsFailed, Server: server, Error: err.Error()}
}
