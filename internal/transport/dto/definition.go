package dto

import "github.com/obsfx/oversee/internal/domain"

type DefinitionLookup struct {
	Status      string       `json:"status"`
	Server      string       `json:"server"`
	Error       string       `json:"error"`
	Definitions []Definition `json:"definitions"`
}

type Definition struct {
	Path           string  `json:"path"`
	External       bool    `json:"external"`
	Side           string  `json:"side"`
	StartLine      int     `json:"startLine"`
	StartCharacter int     `json:"startCharacter"`
	EndLine        int     `json:"endLine"`
	EndCharacter   int     `json:"endCharacter"`
	Snippet        Snippet `json:"snippet"`
}

type Snippet struct {
	StartLine int      `json:"startLine"`
	Lines     []string `json:"lines"`
}

func DefinitionLookupOf(lookup domain.DefinitionLookup) DefinitionLookup {
	definitions := make([]Definition, 0, len(lookup.Definitions))
	for _, definition := range lookup.Definitions {
		definitions = append(definitions, Definition{
			Path:           definition.Path,
			External:       definition.External,
			Side:           string(definition.Side),
			StartLine:      definition.StartLine,
			StartCharacter: definition.StartCharacter,
			EndLine:        definition.EndLine,
			EndCharacter:   definition.EndCharacter,
			Snippet:        Snippet{StartLine: definition.Snippet.StartLine, Lines: definition.Snippet.Lines},
		})
	}
	return DefinitionLookup{Status: string(lookup.Status), Server: lookup.Server, Error: lookup.Error, Definitions: definitions}
}
