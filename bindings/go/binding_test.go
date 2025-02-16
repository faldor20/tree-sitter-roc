package tree_sitter_roc_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_roc "github.com/tree-sitter/tree-sitter-roc/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_roc.Language())
	if language == nil {
		t.Errorf("Error loading Roc grammar")
	}
}
