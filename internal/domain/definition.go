package domain

type DefinitionQuery struct {
	Comparison Comparison
	Side       FileSide
	Path       string
	Line       int
	Character  int
}

type DefinitionLookup struct {
	Status      ServerStatus
	Server      string
	Error       string
	Definitions []Definition
}

type Definition struct {
	Path     string
	External bool
	Side     FileSide
	Line     int
	Snippet  Snippet
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
	if problem := repoPathProblem(q.Path); problem != "" {
		return invalid("path", problem)
	}
	if q.Line < 1 {
		return invalid("line", "must be at least 1")
	}
	if q.Character < 0 {
		return invalid("character", "must not be negative")
	}
	return nil
}

func DefinitionsWith(status ServerStatus, server string) DefinitionLookup {
	return DefinitionLookup{Status: status, Server: server}
}

func DefinitionsUnavailable(server string, status ServerStatus, err error) DefinitionLookup {
	return DefinitionLookup{Status: status, Server: server, Error: status.ErrorOf(err)}
}
