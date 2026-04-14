# Unbody (archived)

> **This repository is archived and no longer actively maintained.**

Unbody started as an open-source project to build the Supabase of the AI era. That vision has evolved.

We now build under **Unbody Labs** — shipping focused tools and products for the AI world. Our most active and direct continuation of Unbody's mission is **Adapt**.

## → [Adapt](https://github.com/unbody-io/adapt)

Adapt is a lightweight (< 200KB), provider-agnostic AI memory and learning framework. It gives AI systems the ability to learn, self-organize, and evolve — in the browser or on the server.

- [Repository](https://github.com/unbody-io/adapt)
- [Documentation](https://adapt.unbody.io/docs)
- [Live Demo](https://adapt.unbody.io/demo)

## Links

- [Unbody Labs](https://unbody.io/)
- [Twitter](https://twitter.com/unbody_io)
- [Discord](https://discord.gg/UBMYRGSPgJ)

---

<details>
<summary>Original setup instructions</summary>

### Prerequisites

- Node.js LTS (20 or 22)
- Docker and Docker Compose
- yarn (npm won't install dependencies correctly)
- OpenAI API key

### Installation

```bash
git clone https://github.com/unbody-io/unbody
cd unbody
yarn
```

### Environment Setup

```bash
cp .env.example .env.local
vim .env.local
```

### Running the Application

```bash
docker compose up -d
yarn start
```

### Create Your First Project

```bash
git clone https://github.com/unbody-io/examples.git
cd examples
```

### Add a Data Source

```bash
yarn unbody-cli source add
```

### Monitor Indexing Progress

Head over to the Temporal dashboard at http://localhost:8233/ to see your files being indexed.

- The dashboard needs to be manually refreshed to get the latest state
- Once indexing is complete, follow the [README](https://github.com/unbody-io/examples) from the examples repository

</details>
