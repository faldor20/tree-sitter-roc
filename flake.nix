{
  inputs = {
    nixpkgs.url = "nixpkgs/nixos-unstable";
    flakelight.url = "github:nix-community/flakelight";
  };

  outputs =
    { flakelight, ... }@inputs:
    flakelight ./. {
      inherit inputs;
      packages.default =
        pkgs:
        pkgs.tree-sitter.buildGrammar {
          language = "roc";
          src = ./.;
          inherit (pkgs.tree-sitter) version;
        };

      withOverlays = [
        (final: prev: { tree-sitter-web = prev.tree-sitter.override { webUISupport = true; }; })
      ];
      #This allows calling tree-sitter webui stuff
      devShells.webui.packages =
        pkgs: with pkgs; [
          nodejs_20
          tree-sitter-web
          python3
          gcc
        ];
      # default devshell that doesn't require tons of dependencies
      devShell.packages =
        pkgs: with pkgs; [
          nodejs_20
          tree-sitter
          python3
          gcc
        ];

    };
}
