{
  inputs = {
    nixpkgs = { url = "nixpkgs-unstable"; };
    flake-utils.url = "github:numtide/flake-utils";
    flake-compat = {
      url = "github:edolstra/flake-compat";
      flake = false;
    };
  };
  outputs = { self, nixpkgs, flake-utils, ... }@inputs:
    let
     defaultPackage = pkgs: pkgs.callPackage (nixpkgs + "/pkgs/development/tools/parsing/tree-sitter/grammar.nix") { } {
       language = "roc";
       src = ./.;
       inherit (pkgs.tree-sitter) version;
     };
    in
    (flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [
            (final: prev: {
              tree-sitter = prev.tree-sitter.override { webUISupport = true; };
            })
          ];
        };
      in {
        defaultPackage = defaultPackage pkgs;
        devShell = pkgs.mkShell {
          nativeBuildInputs = with pkgs; [
            # binutils
            # glibc
            # glibc.dev
            nodejs
            # gcc
            # clang
            # nodePackages.node-gyp
            # lldb
            # gdb
            tree-sitter
            # pkg-config
          ];
        };
      }));

  # // (let pkgs = import nixpkgs { }; in { defaultPackage = defaultPackage pkgs; });

}
