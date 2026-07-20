# Salense Production Hosting

Salense is now prepared for Railway-first production hosting.

Use [RAILWAY.md](./RAILWAY.md) as the authoritative deployment guide.

## Recommended Production Topology

Deploy one Railway project with:

- `salense-web`: Next.js public site and authenticated SaaS app
- `salense-api`: NestJS backend API
- `salense-worker`: long-running sync worker
- Railway PostgreSQL
- Railway Redis

Recommended production domains:

```text
getsalense.com      -> salense-web
www.getsalense.com  -> salense-web
app.getsalense.com  -> salense-web
api.getsalense.com  -> salense-api
```

## Railway Commands

Web service:

```bash
pnpm railway:build:web
pnpm railway:start:web
```

API service:

```bash
pnpm railway:build:api
pnpm railway:migrate
pnpm railway:start:api
```

Worker service:

```bash
pnpm railway:build:worker
pnpm railway:start:worker
```

## Required Production Checks

After deployment:

1. Confirm `https://api.getsalense.com/health` returns `status: ok`.
2. Submit an invitation request.
3. Approve the request from Platform Administration.
4. Accept the invitation and create a merchant account.
5. Connect WooCommerce with read-only REST API keys.
6. Trigger manual sync.
7. Confirm the worker imports data.
8. Confirm Today, Orders, Products, Customers, Inventory, Reports, and Product Detail load synchronized data.
