{
  description = "Development environment for the project";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system}.extend (final: prev: {
          config = prev.config // {
            allowUnfree = true;
          };
        });
      in
      {
        devShell = (import ./devenv/nix/dev-shell.nix { inherit pkgs; });
      }
    );
} 
