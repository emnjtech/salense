# Salense

Salense is a production SaaS monorepo for an AI-powered commerce intelligence platform.

This repository currently contains the initial monorepo foundation only. It follows the Salense PRD + SES baseline architecture and intentionally does not include authentication, database models, commerce integrations, dashboard features, AI workflows, or business logic yet.

## Architecture

The Version 1 foundation is a modular monolith organized as a Turborepo + pnpm workspace.

```text
apps/
  web       Next.js frontend
  api       NestJS backend API
  worker    Background worker package
packages/
  analytics
  reasoning
  ai-engine
  integrations
  database
  shared
  config
docs/
infra/
tests/
scripts/
```

## Requirements

- Node.js 20 or newer
- pnpm 9 or newer

Enable pnpm through Corepack if needed:

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
```

## Install

```bash
pnpm install
```

## Development Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm format:check
```

## Environment

Do not commit secrets. Runtime configuration must be provided through environment variables.

The database package includes a Prisma datasource configured for PostgreSQL through `DATABASE_URL`, but no application models have been added yet.

## Scope Guardrails

This foundation commit is limited to repository structure, workspace configuration, TypeScript strict mode, linting, formatting, testing setup, and tracked placeholders.

Product features must be introduced only in later changes that map back to PRD/SES requirements.
