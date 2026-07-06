# Salense

Salense is a production SaaS monorepo for commerce intelligence across connected marketplace and store platforms.

The current application includes authentication, company setup, secure store connections, read-only synchronization, normalized commerce persistence, dashboards, orders, products, customers, inventory, reports, platform drill-downs, settings, and a lightweight invitation flow. Version 1 remains read-only: marketplace platforms stay the source of truth and Salense does not write back to stores.

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

Required local runtime values are documented in `.env.local.example` and include PostgreSQL, Redis, JWT secrets, token lifetimes, and the Salense credential encryption key. Marketplace credentials are entered per connected store through the application and are stored through the encrypted credential path.

## Local Setup

For Windows development without Docker, use [docs/windows-local-demo-setup.md](docs/windows-local-demo-setup.md).

For CI behavior and matching local checks, use [docs/ci.md](docs/ci.md).
