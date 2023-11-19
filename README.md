# tree-sitter grammar for roc
## installing
Reference it from your editor somehow.
//TODO
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


