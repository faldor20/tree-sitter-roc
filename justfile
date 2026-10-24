set dotenv-load

# Copy only committed compiler source and record its identity.
fixture-builtin:
    #!/usr/bin/env bash
    set -euo pipefail
    : "${ROC_COMPILER_DIR:?ROC_COMPILER_DIR must be set to a Roc checkout}"
    source_path=src/build/roc/Builtin.roc
    git -C "$ROC_COMPILER_DIR" ls-files --error-unmatch "$source_path" >/dev/null
    if [[ -n "$(git -C "$ROC_COMPILER_DIR" status --porcelain -- "$source_path")" ]]; then
        echo "Builtin.roc has uncommitted changes in the compiler checkout" >&2
        exit 1
    fi
    mkdir -p test/fixtures
    cp "$ROC_COMPILER_DIR/$source_path" test/fixtures/Builtin.roc
    branch=$(git -C "$ROC_COMPILER_DIR" symbolic-ref --quiet --short HEAD || printf 'DETACHED')
    { printf 'revision %s\n' "$(git -C "$ROC_COMPILER_DIR" rev-parse HEAD)"; printf 'branch %s\n' "$branch"; printf 'blob %s\n' "$(git hash-object test/fixtures/Builtin.roc)"; } > test/fixtures/Builtin.roc.source

# Check the Zed outline; Z01 intentionally fails on missing nested entries outside CI.
outline-check:
    npm run outline:check

test-gen:
    npm run ts:generate && npm run ts:test

test-gen-filter TEST:
    ./node_modules/.bin/tree-sitter generate && ./node_modules/.bin/tree-sitter test -f {{TEST}}
test:
    npm run ts:test

test-update:
    ./node_modules/.bin/tree-sitter test --update

# run the pinned generator and verify generated files are clean and well-formed
generate-check:
    ./node_modules/.bin/tree-sitter generate && node tools/check-node-types.js --self-test && git diff --exit-code src/parser.c src/grammar.json src/node-types.json

# fail when generated parser complexity exceeds the reviewed budget
parser-metrics-check:
    node tools/check-parser-metrics.js

# generate editor-specific queries from mappings
queries-generate:
    node tools/template-queries.js --queries-dir queries

# generate queries and verify output is clean
queries-check:
    node tools/template-queries.js --queries-dir queries && node tools/check-emacs-query-generator.js && node tools/check-neovim-try-highlight.js --self-test && git diff --exit-code queries-generated

# run CI checks: generation, parser metrics, tests, and queries
ci:
    npm run ci

#generate and build wasm
build-all:
    ./node_modules/.bin/tree-sitter generate && ./node_modules/.bin/tree-sitter wasm
