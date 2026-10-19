test-gen:
    ./node_modules/.bin/tree-sitter generate && ./node_modules/.bin/tree-sitter test

test-gen-filter TEST:
    ./node_modules/.bin/tree-sitter generate && ./node_modules/.bin/tree-sitter test -f {{TEST}}
test:
    ./node_modules/.bin/tree-sitter test

test-update:
    ./node_modules/.bin/tree-sitter test --update

# run the pinned generator and verify generated files are clean and well-formed
generate-check:
    ./node_modules/.bin/tree-sitter generate && node tools/check-node-types.js && git diff --exit-code src/parser.c src/grammar.json src/node-types.json

# fail when generated parser complexity exceeds the reviewed budget
parser-metrics-check:
    node tools/check-parser-metrics.js

# generate editor-specific queries from mappings
queries-generate:
    node tools/template-queries.js --queries-dir queries

# generate queries and verify output is clean
queries-check:
    node tools/template-queries.js --queries-dir queries && git diff --exit-code queries-generated

# run CI checks: generation, parser metrics, tests, and queries
ci:
    just generate-check && just parser-metrics-check && just test && just queries-check

#generate and build wasm
build-all:
    ./node_modules/.bin/tree-sitter generate && ./node_modules/.bin/tree-sitter wasm
