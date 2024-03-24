{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };
  outputs = { self, nixpkgs, flake-utils, ... }@inputs:
    #let
      # defaultPackage = pkgs: pkgs.callPackage (nixpkgs + "/pkgs/development/tools/parsing/tree-sitter/grammar.nix") { } {
      #   language = "norg";
      #   source = ./.;
      #   inherit (pkgs.tree-sitter) version;
      # };
    #in
    (flake-utils.lib.eachDefaultSystem
      (system:
        let
          pkgs = import nixpkgs {
            inherit system; overlays = [
            (final: prev: {
              tree-sitter = prev.tree-sitter.override { webUISupport = true; };
            })
          ];
          };

          treeSitterGrammar = pkgs.tree-sitter.buildGrammar {
            language = "roc";
            version = "0.0.0";
            src = ./.;
            meta.homepage = "https://github.com/faldor20/tree-sitter-roc/tree/master";
          };
        in
        {
          # defaultPackage = defaultPackage pkgs;
          devShell = pkgs.mkShell {
            nativeBuildInputs = with pkgs; [
              nodejs
              nodePackages.node-gyp
              lldb
              gdb
              tree-sitter
            ];
          };

          treeSitterGrammar = treeSitterGrammar;

          neovimPlugin = pkgs.runCommand "tree-sitter-roc" { } ''
            mkdir -p $out/parser
            cp -r ${./neovim}/* $out
            cp ${treeSitterGrammar}/parser $out/parser/roc.so
          '';
        }));

  # // (let pkgs = import nixpkgs { }; in { defaultPackage = defaultPackage pkgs; });

}
