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
- `just outline-check` runs outline self-tests and checks the copied fixture. During Z01 it intentionally fails on missing nested entries and stays outside CI; Z02 adds the nested query and snapshot.
- `just ci` runs generate-check, tests, and queries-check.

### CI helpers

The following npm scripts are designed for CI:

- `npm run ts:generate-check` ensures parser generation is clean.
- `npm run ts:test` runs parser tests.
- `npm run queries:check` validates query templating output.
- `npm run ci` runs all checks.
