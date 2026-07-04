# Continuous Integration

GitHub Actions runs the MVP CI workflow for pull requests to `main` and pushes to `main`.

## What CI Checks

The workflow uses Node.js 20 and pnpm 9.15.4, installs dependencies from `pnpm-lock.yaml`, then runs:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The checks validate linting, TypeScript contracts, automated tests, and production builds across the monorepo. The workflow does not start PostgreSQL, Redis, WooCommerce, Amazon Seller, or TikTok Shop services, and it does not require live marketplace credentials.

## Local Checks

Run the same checks locally from the repository root:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

For the full demo journey, run the local services and seed flow in the [MVP demo runbook](./mvp-demo-runbook.md). CI stays credential-free and service-free so it can run safely on pull requests.
