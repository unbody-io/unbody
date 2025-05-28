# Unbody
[Unbody](https://unbody.io/) is building the [Supabase](https://supabase.com/) of the AI era.

Building AI features today is a complex and fragmented process. Unbody fixes that. We're continuing our journey out in the open. The project is in early development, so expect some rough edges.

## Getting Started

> **Note:** These steps provide a basic setup. For more detailed guidance, join our [Discord community](https://discord.gg/UX8WKEsVPu).

### Prerequisites

- Node.js LTS (20 or 22)
- Docker and Docker Compose
- yarn (npm won’t install dependencies correctly)
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/unbody-io/unbody

# Navigate to the project directory
cd unbody

# Install node modules
yarn
```

### Environment Setup

```bash
# Create .env.local from template
cp .env.example .env.local

# Edit with your preferred editor, add your OpenAI API key
vim .env.local
```

### Running the Application

```bash
# Start the required services
docker compose up -d

# Start the application
yarn start
```

### Create Your First Project

We've prepared a demo project for you to quickly get started:

```bash
# Clone the examples repository
git clone https://github.com/unbody-io/examples.git
cd examples
```

### Add a Data Source

```bash
# Add the storage/ directory from the examples repo as a source to Unbody
yarn unbody-cli source add
```

### Monitor Indexing Progress

Head over to the Temporal dashboard at http://localhost:8233/ to see your files being indexed.

Note:

- The dashboard needs to be manually refreshed to get the latest state
- Once indexing is complete, follow the [README](https://github.com/unbody-io/examples) from the examples repository

If you run into any issues during the setup process, or would like to give us any kind of feedback, join our [Discord community](https://discord.gg/UX8WKEsVPu) and we'll be happy to answer any questions.

## Links

- [Website](https://unbody.io/)
- [Blog](https://unbody.io/blog)
- [Twitter](https://twitter.com/unbody_io)
- [Discord](https://discord.gg/UBMYRGSPgJ)
