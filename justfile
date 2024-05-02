test-gen: 
    tree-sitter generate && tree-sitter test 

test-gen-filter TEST:
    tree-sitter generate && tree-sitter test -f {{TEST}}
test:
    tree-sitter test

test-update:
    tree-sitter test --update

#generate and build wasm
build-all:
    tree-sitter generate && tree-sitter wasm
