# tree-sitter grammar for roc

## installing

Reference it from your editor somehow.
//TODO

### Helix

My full config for roc is below:

```toml
[language-server.roc-ls]
command = "roc_language_server"

[[language]]
name = "roc"
scope = "source.roc"
injection-regex = "roc"
file-types = ["roc"]
shebangs = ["roc"]
roots = []
comment-token = "#"
language-servers = ["roc-ls"]
indent = { tab-width = 2, unit = "  " }
auto-format = true
formatter = { command = "roc", args =[ "format", "--stdin", "--stdout"]}


[language.auto-pairs]
'(' = ')'
'{' = '}'
'[' = ']'
'"' = '"'
[[grammar]]

name = "roc"
source = { git = "https://github.com/faldor20/tree-sitter-roc.git", rev = "whateverTheLatestCommitIs" }
```

1. After adding the above to your `languages.toml`, run `hx --grammar fetch` and then `hx --grammar build`
2. Copy the queries into your helix config using:

```bash
mkdir -p '~/.config/helix/runtime/queries/roc/'
cp ./queries-generated/helix/queries/* '~/.config/helix/runtime/queries/roc/'

```

3. Run `hx --health roc` in a new shell and verify that your changes have been picked up correctly. If things are green, you're good to go.

### Neovim

#### Via nvim-treesitter plugin

Install the [nvim-treesitter](https://github.com/nvim-treesitter/nvim-treesitter?tab=readme-ov-file#installation) plugin using your favorite package manager. The Roc language is [supported by nvim-treesitter](https://github.com/nvim-treesitter/nvim-treesitter?tab=readme-ov-file#supported-languages). Install it with the command:

```vim
:TSInstall roc
```

#### Manually

Add the code in `neovim/roc.lua` to your config somewhere.
Copy the folder `queries-generated/neovim/queries` to your neovim config at `after/` or in a custom neovim plugin at its root directory `./`
eg: `after/queries/roc/highlights.lua`or `my_roc_plugin/queries/roc/highlights.lua`

### Emacs

A [package providing a major mode for Roc](https://gitlab.com/tad-lispy/roc-mode "Emacs Roc mode") is under development.

## contributing

### Setup

#### Nix

Currently i use nix for development so to start the dev environment in nix run

```bash
nix develop
```

I've had some odd issues with the system version of libc being incompatible with my version of treesitter. if tree-sitter is spitting out weird errors try running it in an isolated environments

```bash
nix develop -i
```

#### Not Nix

If you are outside of nix.
You will need:

1. The tree-sitter cli, which will be installed when you run `npm install`
2. A c compiler like gcc or clang

### Query templating

This repo keeps a single set of base queries in the [queries](queries) folder and generates
editor-specific query files via JSON mappings in [query-maps](query-maps). Each mapping
contains per-file sections (highlights, indents, injections, locals, textobjects, tags) and
must include every capture used in the base queries. Set a value to null or an empty string
to drop a capture for a given editor.

To generate query outputs, run:
`npm run queries:generate`
This writes output to queries-generated/<editor>/...

### Running

Once you've made a change, to test it, run:

```bash
just test-gen
```

if you add a new feature you should add a test to one of the test files in `test/corpus/*.txt`
once you are happy with you changes run

```bash
just test-update
```

and it will update the test files with your new parsed tree

### Justfile

Common tasks are available via [justfile](justfile):

- `just test-gen` runs tree-sitter generate and tests.
- `just test-gen-filter TEST=...` runs generate and filters tests.
- `just test` runs tests only.
- `just test-update` updates test corpus outputs.
- `just build-all` builds WASM.
- `just generate-check` ensures generated parser files are up-to-date.
- `just queries-generate` generates editor query outputs.
- `just queries-check` verifies generated queries are clean.
- `just fixture-builtin` copies committed compiler source from `ROC_COMPILER_DIR` (set in a gitignored `.env`; see `.env.example`) and records its revision, branch, and blob. It rejects uncommitted source changes.
- `just outline-check` checks nested Zed outline captures, required Builtin paths, and the reviewed full snapshot. Signatures take precedence over matching definitions; unsigned definitions remain. Type punctuation is included in labels, and function locals are excluded. The check models captures and containment without launching Zed.
- `just ci` runs generated-artifact checks, parser/highlight and query regressions, and the outline check.

### CI helpers

The following npm scripts are designed for CI:

- `npm run ts:generate-check` ensures parser generation is clean.
- `npm run ts:test` runs parser tests.
- `npm run queries:check` validates query templating output.
- `npm run ci` runs all checks, beginning with pinned-syntax self-tests and ending with the pinned whole-file check.

### Pinned upstream syntax acceptance

`npm run pinned-syntax:check` parses the complete, unchanged upstream
`test/echo/all_syntax_test.roc` as one file with the project-local Tree-sitter
0.25.10 CLI and production parser. `npm run pinned-syntax:self-test` independently
checks input integrity, actual CLI recovery output, reporting and runner failures.
Both are offline after normal npm dependencies and native C/C++ build prerequisites
are installed. Every parse uses `--cst --rebuild --time` from the repository root,
with `NO_COLOR=1`; rebuilding compiles only the parser cache, not grammar outputs.
The runner has a 60-second process timeout and a 16 MiB output bound. The current
13,007-byte fixture produces approximately 180 KiB of CST output.

The frozen source is Roc commit `3c0fffe7bdb0b7dacb655aef8584b37decd98952`,
selected by [nightly-2026-10-26-3c0fffe](https://github.com/roc-lang/nightlies/releases/tag/nightly-2026-10-26-3c0fffe)
(release ID 424513578). Full provenance, immutable source URL, byte count and local
SHA-256 are in `test/fixtures/pinned-syntax/source.json`. The vendored fixture and
copyright notice are upstream Roc software under **UPL-1.0**, not this repository's
ISC license; the complete upstream notice is copied alongside it as `LICENSE`.
Copyright © 2019 Richard Feldman and subsequent Roc authors <roc-lang.org/authors>.
Verification checks fixture and license hashes and metadata without downloading
or rewriting anything. `.gitattributes` preserves the fixture's working-tree bytes.

Acceptance requires a complete tree, a final timing summary, consistent process
status/error marking, and no recovery. Exit 0 means acceptance; exit 1 means
syntax discrepancies; exit 2 means input/infrastructure failure (including missing
inputs/CLI, changed checksum, launch/signal/timeout/overflow, unusable output or
contradictory evidence). Reports use zero-based rows and byte columns; zero-width
ranges are insertion points. Recovery reports retain raw CLI output and excerpts.
Anonymous missing tokens are visible in CST even when XML omits them. Named missing
leaves can only be described as `zero-width error-marked node`, not confidently
as MISSING. Actual CLI self-tests demonstrate a named missing leaf with exit zero;
this contradictory result is rejected as infrastructure failure. An error-marked
subtree without a visible recovery is also rejected, never silently accepted.
The no-visible-recovery fallback is tested with controlled output. Actual CLI tests
cover multiline ERROR leaves for both quoted and triple-quoted input. Multiline
text continuation rows are validated against the owning node's source bytes;
reports use that node's actual range, not the CLI's continuation display columns.
The documentation-comment case contains separate single-line leaves. No clean
multiline named leaf has been demonstrated with the production grammar; a genuine
multiline leaf is tested with controlled clean and error-marked output, including
rejection of truncated or corrupted continuations, incorrect row order, multi-row
continuation spans, and incorrect indentation (including extra error-tree display
padding). The renderer assumptions follow CLI 0.25.10
[`cst_render_node` and `write_node_text`](https://github.com/tree-sitter/tree-sitter/blob/v0.25.10/cli/src/parse.rs),
including its optional extra display space for error-free nodes in error traversal.
Separate forced rebuild invocations avoid ambiguous multi-file output and unverified
shared caches.

This establishes **Tree-sitter acceptance only**: no compiler build/execution,
fixture execution, import resolution or structural comparison occurs. The fixture's
`../../README.md` import is deliberately unresolved. There are zero exceptions,
no automatic baseline recording and no suppression mechanism. A failing fixture
requires individual user decisions before grammar fixes or expected differences;
passing self-tests alone do not make a rejected fixture or CI green.

To update the pin, obtain explicit review approval for a selected release and full
source commit, download the complete unchanged file and applicable license notice
from immutable commit URLs, compute their SHA-256 values locally, update provenance,
and review the byte/provenance diff. The checker freezes the exact full commit and
release identity: review and update its `loadPin` constants together with metadata,
including the pin-integrity regression for a different full commit sharing the
same release abbreviation. Run both dedicated commands and full CI
separately. Never advance to latest automatically or change grammar, queries or
existing baselines to hide a discrepancy.
