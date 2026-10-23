package gdscript

import (
	"github.com/obsfx/oversee/internal/gdscript/grammar"
	"github.com/obsfx/oversee/internal/notices"
)

func Notices() []notices.Notice {
	return []notices.Notice{
		{Project: "tree-sitter/tree-sitter", Version: grammar.TreeSitterVersion, License: grammar.LicenseTreeSitter},
		{Project: "PrestonKnopp/tree-sitter-gdscript", Version: grammar.GrammarCommit, License: grammar.LicenseGrammar},
	}
}
