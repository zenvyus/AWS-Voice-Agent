# AWS Airline Voice Agent

AWS-native AI voice agent for airline customer service, powered by Amazon Connect, Amazon Transcribe, Amazon Bedrock (Claude Sonnet 4), and Amazon Polly.

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9.10 (`npm install -g pnpm`)
- **AWS CDK CLI** >= 2.150 (`npm install -g aws-cdk`)
- **AWS CLI** configured with credentials
- **Python** >= 3.12 (for orchestrator and Lambda development)
- **uv** (Python package manager: `pip install uv`)

## Quick Start

```bash
# Install dependencies
pnpm install

# Synthesise CDK (dev environment)
cd infra && pnpm synth

# Run unit tests
pnpm test

# Deploy networking stack (dev)
cd infra && cdk deploy -c env=dev
```

## Creating a New Environment

1. Add a config file: `infra/lib/config/env.<name>.ts`
2. Register it in `infra/lib/config/index.ts`
3. Deploy: `cd infra && cdk deploy -c env=<name>`

## Repository Structure

```
├── infra/                    # AWS CDK v2 infrastructure (TypeScript)
│   ├── bin/app.ts            # CDK entry point
│   ├── lib/constructs/       # Reusable L3 constructs
│   ├── lib/stacks/           # Composed stacks
│   ├── lib/config/           # Zod-validated env configs
│   └── test/                 # CDK unit tests
├── services/                 # Runtime services (future phases)
├── lambdas/                  # Lambda functions (future phases)
├── tests/                    # Integration and E2E tests
├── docs/                     # Documentation (PRD, stories, TID per phase)
├── .github/workflows/        # CI/CD pipelines
└── pyproject.toml            # Python tooling config
```

## Scripts

| Command                 | Description               |
| ----------------------- | ------------------------- |
| `pnpm test`             | Run unit tests            |
| `pnpm test:integration` | Run integration tests     |
| `pnpm test:e2e`         | Run end-to-end tests      |
| `pnpm test:regression`  | Run full regression suite |
| `pnpm lint`             | Lint all packages         |
| `pnpm format`           | Format all files          |
| `pnpm format:check`     | Check formatting          |

## Documentation

See [`docs/index.md`](./docs/index.md) for the phase index and links to all documentation.

## Architecture

See [`Architecture/AWS_AI_Voice_Agent_Architecture_v1.docx`](./Architecture/AWS_AI_Voice_Agent_Architecture_v1.docx) for the full technical design.
