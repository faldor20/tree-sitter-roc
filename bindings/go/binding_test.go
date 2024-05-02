package tree_sitter_roc_test

import (
	"testing"

	tree_sitter "github.com/smacker/go-tree-sitter"
	"github.com/tree-sitter/tree-sitter-roc"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_roc.Language())
	if language == nil {
		t.Errorf("Error loading Roc grammar")
	}
}
