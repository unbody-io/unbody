{
  description = "Development environment for the project";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";
    flake-utils.url = "github:numtide/flake-utils";
    process-compose-flake.url = "github:Platonic-Systems/process-compose-flake";
    services-flake.url = "github:juspay/services-flake";
    flake-parts.url = "github:hercules-ci/flake-parts";
    systems.url = "github:nix-systems/default";
  };

  outputs =
    inputs:
    inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      systems = import inputs.systems;
      imports = [
        # 2. Import the flake-module
        inputs.process-compose-flake.flakeModule
      ];
      perSystem =
        {
          config,
          pkgs,
          system,
          ...
        }:
        {
          _module.args.pkgs = import inputs.nixpkgs {
            inherit system;
            config.allowUnfree = true;
          };
          process-compose."services" = {
            imports = [
              inputs.services-flake.processComposeModules.default
              ./devenv/nix/temporal.service.nix
            ];
            services.mongodb."mongodb".enable = true;
            services.temporal.enable = true;
            services.redis."redis".enable = true;
          };
          devShells.default = (import ./devenv/nix/dev-shell.nix { inherit pkgs; });
        };
    };
}
