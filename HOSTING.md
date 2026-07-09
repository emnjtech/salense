# Salense Split Production Hosting

This guide prepares Salense for split production hosting:

- Hostinger: public landing page at `https://getsalense.com` and `https://www.getsalense.com`
- Vercel: authenticated SaaS app at `https://app.getsalense.com`
- Render or Railway: backend API at `https://api.getsalense.com`
- Render or Railway: sync worker service
- Neon or Supabase: PostgreSQL
- Upstash: Redis

## Target Architecture

```text
getsalense.com / www.getsalense.com
  Hostinger public landing page
  Request invitation CTA or form
    ↓
api.getsalense.com
  NestJS API
  Authentication, invitations, admin, store connections, AI briefing
    ↓
PostgreSQL
  Neon or Supabase

app.getsalense.com
  Vercel Next.js SaaS app
  Login, admin, dashboard, products, reports, integrations
    ↓
api.getsalense.com

Worker service
  Render/Railway background worker
    ↓
Upstash Redis queue
    ↓
api services and PostgreSQL normalized commerce data
```

## Repository Services

Use these build and start commands.

### API service

Build command:

```bash
pnpm install --frozen-lockfile
pnpm --filter @salense/database prisma:generate
pnpm --filter @salense/api build
```

Start command:

```bash
pnpm --filter @salense/api start
```

Health check path:

```text
/health
```

### Worker service

Build command:

```bash
pnpm install --frozen-lockfile
pnpm --filter @salense/database prisma:generate
pnpm --filter @salense/api build
pnpm --filter @salense/worker build
```

Start command:

```bash
pnpm --filter @salense/worker start
```

The worker must use the same `DATABASE_URL`, `REDIS_URL`, and `SALENSE_CREDENTIAL_ENCRYPTION_KEY` as the API.

### Vercel SaaS app

Vercel project root:

```text
apps/web
```

Build command:

```bash
pnpm --filter @salense/web build
```

Install command:

```bash
pnpm install --frozen-lockfile
```

Production domain:

```text
app.getsalense.com
```

## Production Environment Variables

Use `.env.example` as the production template.

### Required for API and worker

```text
DATABASE_URL
REDIS_URL
JWT_ACCESS_TOKEN_SECRET
JWT_REFRESH_TOKEN_SECRET
JWT_ACCESS_TOKEN_EXPIRES_IN
JWT_REFRESH_TOKEN_EXPIRES_IN
SALENSE_CREDENTIAL_ENCRYPTION_KEY
PUBLIC_REGISTRATION_ENABLED
PUBLIC_APP_URL
API_CORS_ORIGINS
```

Production values:

```text
PUBLIC_APP_URL=https://app.getsalense.com
API_CORS_ORIGINS=https://getsalense.com,https://www.getsalense.com,https://app.getsalense.com
```

### Required for Vercel web app

```text
NEXT_PUBLIC_API_URL=https://api.getsalense.com
```

`NEXT_PUBLIC_API_BASE_URL` is still supported for backward compatibility, but production should use `NEXT_PUBLIC_API_URL`.

### Email

```text
RESEND_API_KEY
SALENSE_EMAIL_FROM=Salense <hello@getsalense.com>
```

Invitation requests and approval emails are sent by the API through Resend.

### Marketplace authorization

```text
SHOPIFY_CLIENT_ID
SHOPIFY_CLIENT_SECRET
SHOPIFY_SCOPES
SHOPIFY_REDIRECT_URI=https://api.getsalense.com/store-integrations/shopify/oauth/callback

AMAZON_LWA_CLIENT_ID
AMAZON_LWA_CLIENT_SECRET
AMAZON_SP_API_REDIRECT_URI=https://api.getsalense.com/store-integrations/amazon-seller/oauth/callback
AMAZON_SP_API_APP_ID

TIKTOK_SHOP_APP_KEY
TIKTOK_SHOP_APP_SECRET
TIKTOK_SHOP_REDIRECT_URI=https://api.getsalense.com/store-integrations/tiktok-shop/oauth/callback
```

WooCommerce manual read-only REST API key setup does not require registering Salense with WooCommerce.

### AI narrative layer

```text
OPENAI_API_KEY
OPENAI_MODEL=gpt-4o-mini
TEMPERATURE=0.2
```

AI uses synchronized backend data only. It must not call marketplace APIs directly.

## Database Setup

Use Neon or Supabase PostgreSQL.

1. Create the production database.
2. Copy the production connection string into `DATABASE_URL`.
3. Generate Prisma client:

```bash
pnpm --filter @salense/database prisma:generate
```

4. Apply production migrations safely:

```bash
pnpm db:migrate:deploy
```

Do not use `prisma db push` in production.
Do not use `prisma migrate dev` in production.

## Redis Setup

Use Upstash Redis.

1. Create a Redis database.
2. Use the `rediss://` connection URL in `REDIS_URL`.
3. Set the same `REDIS_URL` for API and worker.

The API uses Redis for sync queue operations.
The worker consumes queue jobs from the same Redis instance.

## Backend CORS

Production CORS must allow:

```text
https://getsalense.com
https://www.getsalense.com
https://app.getsalense.com
```

Set:

```text
API_CORS_ORIGINS=https://getsalense.com,https://www.getsalense.com,https://app.getsalense.com
```

## Hostinger Landing Page

Hostinger should serve the public marketing site only.

Recommended links:

```text
Login → https://app.getsalense.com/login
Get started → https://app.getsalense.com/pricing
Request invitation → https://app.getsalense.com/request-invitation
See how it works → https://app.getsalense.com/how-it-works
```

Alternative invitation form:

Hostinger may host a static request invitation form that posts directly to:

```text
POST https://api.getsalense.com/subscription/invitations
```

The API CORS allowlist includes `getsalense.com` and `www.getsalense.com`, so invitation requests can originate from the public landing page.

## Vercel SaaS App

Deploy `apps/web` to Vercel with:

```text
NEXT_PUBLIC_API_URL=https://api.getsalense.com
```

Attach:

```text
app.getsalense.com
```

The authenticated app contains:

- login
- invitation acceptance
- admin login and approval workflow
- Today dashboard
- Orders, Products, Customers, Inventory, Reports
- Store Integrations

## Render/Railway API

Deploy the API as a web service.

Set:

```text
PORT
DATABASE_URL
REDIS_URL
JWT_ACCESS_TOKEN_SECRET
JWT_REFRESH_TOKEN_SECRET
SALENSE_CREDENTIAL_ENCRYPTION_KEY
PUBLIC_APP_URL=https://app.getsalense.com
API_CORS_ORIGINS=https://getsalense.com,https://www.getsalense.com,https://app.getsalense.com
RESEND_API_KEY
SALENSE_EMAIL_FROM=Salense <hello@getsalense.com>
NEXT_PUBLIC_API_URL=https://api.getsalense.com
```

Run migrations before or during deploy:

```bash
pnpm db:migrate:deploy
```

Health check:

```text
https://api.getsalense.com/health
```

Expected healthy response:

```json
{
  "status": "ok",
  "checks": {
    "api": { "status": "ok" },
    "database": { "status": "ok" },
    "redis": { "status": "ok" }
  }
}
```

## Render/Railway Worker

Deploy the worker as a background service.

Use the same production env vars as the API for:

```text
DATABASE_URL
REDIS_URL
SALENSE_CREDENTIAL_ENCRYPTION_KEY
```

Worker start command:

```bash
pnpm --filter @salense/worker start
```

WooCommerce sync must run through backend queue jobs and the worker, not the frontend.

## DNS

Set DNS records:

```text
getsalense.com        → Hostinger
www.getsalense.com    → Hostinger
app.getsalense.com    → Vercel
api.getsalense.com    → Render/Railway API
```

Configure SSL/TLS for every host.

## Production Smoke Tests

Run these after deployment:

1. Open `https://getsalense.com`.
2. Confirm public navigation points to `https://app.getsalense.com` for app flows.
3. Submit an invitation request from the landing page or app.
4. Confirm the request appears in platform admin.
5. Approve the request and confirm invitation email/link is generated.
6. Accept invitation and create a merchant account.
7. Log in at `https://app.getsalense.com/login`.
8. Confirm a new merchant workspace has no seeded business data.
9. Connect a WooCommerce store using read-only REST API keys.
10. Trigger manual sync.
11. Confirm the worker processes the sync job.
12. Confirm Orders, Products, Customers, Today, Reports, and Product detail use synchronized data.
13. Confirm `/health` returns `status: ok`.
14. Confirm no credentials, hashes, encrypted secrets, or raw marketplace payloads appear in API responses.

## Production Readiness Notes

- Keep `PUBLIC_REGISTRATION_ENABLED=false` until public registration is intentionally opened.
- Platform admins are database-backed and should be created using the admin bootstrap flow.
- `SALENSE_CREDENTIAL_ENCRYPTION_KEY` must remain stable. Changing it prevents decrypting stored marketplace credentials.
- AI briefings must use Salense synchronized backend data only.
- Marketplace writes are not enabled.
