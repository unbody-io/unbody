# Development Environment Setup

This guide will help you set up your development environment for Unbody.

## Prerequisites

- [Nix](https://github.com/DeterminateSystems/nix-installer) package manager
- [Docker](https://docs.docker.com/desktop/) with Docker Compose plugin
- Git

## Setup Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/unbody-io/opensource.git
   cd unbody
   ```

2. Enable Nix flakes:

   If you installed Nix using the [Determinate Nix Installer](https://github.com/DeterminateSystems/nix-installer), flakes are enabled by default and you can skip this step.

   For other installation methods, follow the instructions in the [NixOS Wiki Flakes guide](https://nixos.wiki/wiki/Flakes).

3. Enter the development shell:

   ```bash
   nix develop
   ```

   This will set up your environment with:

   - Node.js 22 (LTS)
   - Yarn package manager
   - Local `node_modules/.bin` in your PATH

4. Install dependencies:
   ```bash
   yarn install
   ```

## Development Workflow

1. Start services

```
docker compose up
```

2. Start the development server:

```bash
yarn start:dev
```
