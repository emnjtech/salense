# MVP Demo Runbook

This runbook starts the local Salense MVP demo with deterministic seed data. The demo is read-only: Salense analyses normalized commerce records and never writes back to WooCommerce, Amazon Seller, TikTok Shop, or Shopify.

For a Windows setup without Docker, use [Windows Local Demo Setup](./windows-local-demo-setup.md).

## Demo Accounts

Use the seeded demo account:

- Email: `demo@salense.local`
- Password: `DemoPassword123!`

## 1. Start Local Services

Start PostgreSQL and Redis locally. One simple Docker-based setup is:

```bash
docker run --name salense-postgres -e POSTGRES_USER=salense -e POSTGRES_PASSWORD=salense -e POSTGRES_DB=salense_dev -p 5432:5432 -d postgres:16
docker run --name salense-redis -p 6379:6379 -d redis:7
```

Set the local environment values used by the API and seed script:

```bash
DATABASE_URL="postgresql://salense:salense@localhost:5432/salense_dev?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_TOKEN_SECRET="local-access-token-secret"
JWT_REFRESH_TOKEN_SECRET="local-refresh-token-secret"
JWT_ACCESS_TOKEN_EXPIRES_IN="15m"
JWT_REFRESH_TOKEN_EXPIRES_IN="7d"
SALENSE_CREDENTIAL_ENCRYPTION_KEY="MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="
PUBLIC_REGISTRATION_ENABLED="false"
```

No WooCommerce, Amazon Seller, TikTok Shop, or Shopify credentials are required for the seeded MVP demo. Live connection forms are available for local validation testing only.

Before starting the demo, validate the local environment:

```bash
pnpm demo:check-env
```

## 2. Apply Prisma Schema

Generate the Prisma client and apply the current schema to the local database:

```bash
pnpm --filter @salense/database prisma:generate
pnpm --filter @salense/database exec prisma db push --schema packages/database/prisma/schema.prisma
```

## 3. Seed Demo Data

Create the Northstar Home Goods demo workspace:

```bash
pnpm demo:seed
```

The seed is rerunnable. It recreates the demo user, business, stores, orders, products, customers, inventory snapshots, refunds, and sync cursors.

Create the first internal Platform Administrator:

```bash
pnpm admin:create -- --email admin@salense.local --first-name Salense --last-name Admin --password "AdminPassword123!"
```

Use a secure local password. The script stores only a password hash.

## 4. Start The API

In one terminal:

```bash
pnpm --filter @salense/api dev
```

## 5. Start The Web App

In another terminal:

```bash
pnpm --filter @salense/web dev
```

Open the web app at `http://localhost:3000` and log in with the demo account.

## Recommended Walkthrough

1. Log in as `demo@salense.local`.
2. Open Today and show the Business Health Score, multi-platform metrics, refund signal, top product, and deterministic business insights.
3. Open Orders and show seeded WooCommerce, Amazon Seller, TikTok Shop, and Shopify orders while preserving each platform's identity.
4. Open Products and show platform-scoped products without automatic marketplace merging.
5. Open Customers and show new customers, returning customers, highest lifetime customer, and the searchable customer table.
6. Open Inventory and show low stock, out of stock, inventory value, and deterministic stock insights.
7. Open Store Integrations and show the seeded WooCommerce, Amazon Seller, TikTok Shop, and Shopify connections. Avoid entering live marketplace credentials during the MVP demo.

## Private Access Onboarding

Salense currently operates as an invite-only product for pilot users.

1. A business requests access from `/request-invitation`.
2. A database-backed Platform Administrator signs in at `/admin/login` and reviews requests at `/admin`.
3. Approving a request creates a single-use `/accept-invitation?token=...` link.
4. The invited user sets their password and receives a verified account for the approved business.

To send invitation links by email through Resend, start the API with:

```bash
PUBLIC_APP_URL="http://localhost:3000"
RESEND_API_KEY="re_your_resend_api_key"
SALENSE_EMAIL_FROM="Salense <hello@getsalense.com>"
```

If `RESEND_API_KEY` is not set, the admin portal still displays the generated invitation link for manual sharing.

Set `PUBLIC_REGISTRATION_ENABLED=true` only when testing the preserved public registration flow.

## Optional Shopify Connection Test

For local validation testing, Shopify requires a shop domain such as `northstar-home.myshopify.com`, a store URL, an Admin API access token, and an API version such as `2024-10`. Salense stores the token through the encrypted credential path and uses only read-only Admin API requests.

## Guardrails

- Version 1 is read-only.
- Marketplace platforms remain the source of truth.
- Analytics calculate deterministic metrics; AI is not part of this MVP pass.
- Do not demo billing, roles, reports, or live marketplace API flows.
