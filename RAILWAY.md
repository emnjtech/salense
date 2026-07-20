# Salense Railway Deployment Guide

This guide deploys Salense as one Railway project with separate services for the web app, API, worker, PostgreSQL, and Redis.

## Target Services

Create one Railway project with these services:

| Railway service | Source | Purpose |
| --- | --- | --- |
| `salense-web` | GitHub repo | Public site and authenticated SaaS app |
| `salense-api` | GitHub repo | NestJS API, auth, invitations, integrations, AI briefing |
| `salense-worker` | GitHub repo | Long-running BullMQ sync worker |
| `salense-postgres` | Railway PostgreSQL | Production database |
| `salense-redis` | Railway Redis | Sync queue and worker coordination |

Recommended domains:

```text
getsalense.com      -> salense-web
www.getsalense.com  -> salense-web
app.getsalense.com  -> salense-web
api.getsalense.com  -> salense-api
```

## Shared Setup

1. Connect the GitHub repository to Railway.
2. Add PostgreSQL and Redis services to the same Railway project.
3. Create three deployable services from the same repo:
   - `salense-web`
   - `salense-api`
   - `salense-worker`
4. Use Node 20.
5. Use pnpm. The repository declares `packageManager: pnpm@9.15.4`.

Railway should install dependencies from the repository root.

Install command for every service:

```bash
pnpm install --frozen-lockfile
```

## Web Service

Service name:

```text
salense-web
```

Build command:

```bash
pnpm railway:build:web
```

Start command:

```bash
pnpm railway:start:web
```

Environment variables:

```text
NEXT_PUBLIC_API_URL=https://api.getsalense.com
PUBLIC_APP_URL=https://app.getsalense.com
```

Attach these custom domains to the web service:

```text
getsalense.com
www.getsalense.com
app.getsalense.com
```

The current web service contains both public pages and the authenticated SaaS app. A separate static landing app can be split out later if needed.

## API Service

Service name:

```text
salense-api
```

Build command:

```bash
pnpm railway:build:api
```

Pre-deploy command:

```bash
pnpm railway:migrate
```

Start command:

```bash
pnpm railway:start:api
```

Health check path:

```text
/health
```

Attach this custom domain to the API service:

```text
api.getsalense.com
```

Required environment variables:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_ACCESS_TOKEN_SECRET=
JWT_REFRESH_TOKEN_SECRET=
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=7d
SALENSE_CREDENTIAL_ENCRYPTION_KEY=
PUBLIC_REGISTRATION_ENABLED=false
PUBLIC_APP_URL=https://app.getsalense.com
NEXT_PUBLIC_API_URL=https://api.getsalense.com
API_CORS_ORIGINS=https://getsalense.com,https://www.getsalense.com,https://app.getsalense.com
RESEND_API_KEY=
SALENSE_EMAIL_FROM=Salense <hello@getsalense.com>
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
TEMPERATURE=0.2
```

Marketplace environment variables:

```text
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=
SHOPIFY_SCOPES=read_orders,read_products,read_customers,read_inventory
SHOPIFY_REDIRECT_URI=https://api.getsalense.com/store-integrations/shopify/oauth/callback

AMAZON_LWA_CLIENT_ID=
AMAZON_LWA_CLIENT_SECRET=
AMAZON_SP_API_REDIRECT_URI=https://api.getsalense.com/store-integrations/amazon-seller/oauth/callback
AMAZON_SP_API_APP_ID=

TIKTOK_SHOP_APP_KEY=
TIKTOK_SHOP_APP_SECRET=
TIKTOK_SHOP_REDIRECT_URI=https://api.getsalense.com/store-integrations/tiktok-shop/oauth/callback
```

WooCommerce manual read-only REST API keys do not require registering a Salense app with WooCommerce.

## Worker Service

Service name:

```text
salense-worker
```

Build command:

```bash
pnpm railway:build:worker
```

Start command:

```bash
pnpm railway:start:worker
```

Required environment variables:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
SALENSE_CREDENTIAL_ENCRYPTION_KEY=
```

The worker must use the same `DATABASE_URL`, `REDIS_URL`, and `SALENSE_CREDENTIAL_ENCRYPTION_KEY` as the API.

Do not deploy the worker as a serverless function. It must remain a continuously running service.

## Database

Use Railway PostgreSQL.

Production schema updates should use:

```bash
pnpm railway:migrate
```

Do not use `prisma db push` in production.

Do not change `SALENSE_CREDENTIAL_ENCRYPTION_KEY` after real store credentials have been saved. Changing the key prevents Salense from decrypting existing marketplace credentials.

## Redis

Use Railway Redis.

Set the same `REDIS_URL` on:

```text
salense-api
salense-worker
```

The API queues synchronization jobs. The worker consumes those jobs.

## Admin Bootstrap

After the API is deployed and migrations have run, create the first platform admin from a Railway shell or one-off command:

```bash
pnpm admin:create -- --email admin@getsalense.com --first-name Salense --last-name Admin --password "replace-with-a-strong-password"
```

Do not commit real admin credentials.

## DNS

Point DNS records to the Railway-provided custom domain targets:

```text
getsalense.com      -> salense-web
www.getsalense.com  -> salense-web
app.getsalense.com  -> salense-web
api.getsalense.com  -> salense-api
```

Use Railway's DNS instructions for CNAME, A, or ALIAS records depending on your domain provider.

## Smoke Tests

Run these after deployment:

1. Open `https://getsalense.com`.
2. Open `https://app.getsalense.com/login`.
3. Confirm `https://api.getsalense.com/health` returns `status: ok`.
4. Submit an invitation request.
5. Log in to `https://app.getsalense.com/admin/login`.
6. Approve the invitation.
7. Accept the invitation and create a merchant account.
8. Connect a WooCommerce store with read-only REST API keys.
9. Trigger manual sync.
10. Confirm the worker processes the job.
11. Confirm Orders, Products, Customers, Today, Reports, and Product Detail use synchronized data.

## Railway Service Command Summary

| Service | Build command | Start command |
| --- | --- | --- |
| Web | `pnpm railway:build:web` | `pnpm railway:start:web` |
| API | `pnpm railway:build:api` | `pnpm railway:start:api` |
| Worker | `pnpm railway:build:worker` | `pnpm railway:start:worker` |

