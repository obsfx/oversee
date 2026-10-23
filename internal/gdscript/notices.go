package gdscript

import "github.com/obsfx/oversee/internal/gdscript/grammar"

type Notice struct {
	Project string
	Version string
	License string
}

func (n Notice) Text() string {
	return n.Project + " " + n.Version + "\n\n" + n.License
}

func Notices() []Notice {
	return []Notice{
		{Project: "tree-sitter/tree-sitter", Version: grammar.TreeSitterVersion, License: grammar.LicenseTreeSitter},
		{Project: "PrestonKnopp/tree-sitter-gdscript", Version: grammar.GrammarCommit, License: grammar.LicenseGrammar},
		{Project: "msuozzo/bonsai", Version: grammar.BonsaiVersion, License: grammar.LicenseBonsai},
	}
}
