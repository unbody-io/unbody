{ pkgs }: pkgs.mkShell {
    buildInputs = with pkgs; [
      # Node.js and related tools
      # Typescript is installed via yarn
      nodejs_22 ## Current LTS version
      yarn
    ];

    shellHook = ''
      echo "------------------------------------------------------------"
      cat << "EOF"
          __  ______  / /_  ____  ____/ /_  __
         / / / / __ \/ __ \/ __ \/ __  / / / /
        / /_/ / / / / /_/ / /_/ / /_/ / /_/ / 
        \__,_/_/ /_/_.___/\____/\__,_/\__, /  
           _____/ /_  ___  / / /     /____/   
          / ___/ __ \/ _ \/ / /               
         (__  ) / / /  __/ / /                
        /____/_/ /_/\___/_/_/                 
                                              
      EOF
      ## Add node_modules/.bin to PATH
      export PATH="$PWD/node_modules/.bin:$PATH"
      echo "You're in the Unbody nix development shell."
      echo "------------------------------------------------------------"
      echo "Available tools:"
      echo "  - Node.js: $(node --version)"
      echo "  - Yarn: $(yarn --version)"
      
      # Track overall dependency status (1=satisfied, 0=missing dependencies)
      DEPENDENCIES_SATISFIED=1
      
      # Check if Docker is installed
      if ! command -v docker &> /dev/null; then
        echo "------------------------------------------------------------"
        echo "⚠️  Docker is not installed or not in PATH."
        echo "⚠️  Please ensure Docker and Docker Compose are installed on your system:"
        echo "️   https://docs.docker.com/desktop/"
        DEPENDENCIES_SATISFIED=0
      else
        DOCKER_VERSION=$(docker --version | cut -d ' ' -f3 | tr -d ',')
        echo "  - Docker: $DOCKER_VERSION"
        
        # Check if Docker Compose plugin is installed
        if ! docker compose version &> /dev/null; then
          echo "⚠️  Docker Compose plugin is not installed."
          echo "⚠️  Please ensure Docker Desktop is up to date or install the plugin manually:"
          echo "⚠️  https://docs.docker.com/compose/install/"
          DEPENDENCIES_SATISFIED=0
        else
          COMPOSE_VERSION=$(docker compose version --short)
          echo "  - Docker Compose: $COMPOSE_VERSION"
        fi
      fi
      
      echo "------------------------------------------------------------"
      if [ "$DEPENDENCIES_SATISFIED" -eq 1 ]; then
        echo "Quick Start:"
        echo "  1. Start services: docker compose up"
        echo "  2. Run 'yarn'"
        echo "  2. Start the development server: yarn start:dev"
        echo ""
        echo "Happy hacking!"
        echo "------------------------------------------------------------"
      fi
    '';
  }
