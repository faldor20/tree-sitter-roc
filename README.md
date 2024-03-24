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
source = { git = "https://github.com/faldor20/tree-sitter-roc.git", rev = "381743cd40ee19a9508c6445aacb9085d4bc0cf8" }
```
1. After adding the above to your `languages.toml`, run `hx --grammar fetch` and then `hx --grammar build`
2. Add `~/.config/helix/runtime/queries/roc/` and put the files from this repository's `queries` directory in there.
3. Run `hx --health roc` in a new shell and verify that your changes have been picked up correctly. If things are green, you're good to go. 

### Neovim
#### Nix Flake
The `neovimPlugin.<system>` attribute of the `flake.nix` in this repository builds a Roc plugin.
#### Without Nix
Add the code in `neovim/roc.lua` to your config somewhere.
Copy the folder `neovim/queries` to your neovim config at `after/` or in a custom neovim plugin at its root directory `./`
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
````
#### Not Nix
If you are outside of nix.
You will need:
1. The tree-sitter cli, which will be installed when you run `npm install`
2. A c compiler like gcc or clang

### Running
Once you've made a change, to test it, run:
```bash
tree-sitter generate
tree-sitter test 
```
if you add a new feature you should add a test to one of the test files in `test/corpus/*.txt`
once you are happy with you changes run 

```bash
tree-sitter test --update
```
and it will update the test files with your new parsed tree


