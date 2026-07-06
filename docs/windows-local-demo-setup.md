# Windows Local Demo Setup

This guide runs the Salense MVP demo on Windows without Docker. It uses local PostgreSQL, a local Redis-compatible server, and the deterministic demo seed.

## 1. Install Or Start PostgreSQL

Install PostgreSQL for Windows if it is not already installed. Salense expects a normal PostgreSQL server listening on `localhost`.

Start the Windows service from PowerShell:

```powershell
Get-Service *postgres*
Start-Service postgresql-x64-17
```

Your service may be named `postgresql-x64-18`, `postgresql-x64-16`, or similar. Use the name returned by `Get-Service *postgres*`.

Create a local demo user and database. Open SQL Shell, pgAdmin, or `psql`, then run:

```sql
CREATE USER salense WITH PASSWORD 'salense';
CREATE DATABASE salense_dev OWNER salense;
GRANT ALL PRIVILEGES ON DATABASE salense_dev TO salense;
```

If the user or database already exists, keep the existing objects and make sure your `.env.local` matches the working username, password, database, host, and port.

## 2. Install Or Start Redis

Salense uses Redis for the sync queue. For a Windows setup without Docker, use one of these local options:

- A Redis-compatible Windows service such as Memurai.
- Redis inside WSL Ubuntu.
- Another local Redis server that listens on `localhost:6379`.

For WSL Ubuntu:

```powershell
wsl --install
wsl
```

Then inside Ubuntu:

```bash
sudo apt update
sudo apt install redis-server
sudo service redis-server start
redis-cli ping
```

`redis-cli ping` should return `PONG`.

For a Windows Redis-compatible service, start it from PowerShell after installation:

```powershell
Get-Service *redis*
Start-Service <your-redis-service-name>
```

## 3. Create `.env.local`

Copy the example file:

```powershell
Copy-Item .env.local.example .env.local
```

Use these local demo values unless your PostgreSQL or Redis setup uses different credentials or ports:

```text
DATABASE_URL="postgresql://salense:salense@localhost:5432/salense_dev?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_TOKEN_SECRET="local-access-token-secret"
JWT_REFRESH_TOKEN_SECRET="local-refresh-token-secret"
JWT_ACCESS_TOKEN_EXPIRES_IN="15m"
JWT_REFRESH_TOKEN_EXPIRES_IN="7d"
SALENSE_CREDENTIAL_ENCRYPTION_KEY="MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="
PUBLIC_REGISTRATION_ENABLED="false"
PLATFORM_ADMIN_EMAIL="demo@salense.local"
AI_PROVIDER_API_KEY=""
```

The credential encryption key above is demo-only. Do not use it in production.

`PUBLIC_REGISTRATION_ENABLED=false` keeps Salense in private-access mode. The
`/register` route remains in the codebase for future public registration, but the backend rejects
public registration while this flag is disabled. `PLATFORM_ADMIN_EMAIL` bootstraps the first
internal Salense platform administrator with `PlatformRole = SUPER_ADMIN` after normal login.

## 4. Check Local Demo Environment

Run:

```powershell
pnpm demo:check-env
```

This validates the required environment variables and checks whether PostgreSQL and Redis are reachable. It does not start the API, web app, or worker.

## 5. Generate Prisma Client

Run:

```powershell
pnpm --filter @salense/database prisma:generate
```

## 6. Apply Prisma Schema

Run:

```powershell
pnpm --filter @salense/database exec prisma db push --schema packages/database/prisma/schema.prisma
```

If this fails with an authentication error, the `DATABASE_URL` in `.env.local` does not match your local PostgreSQL user, password, database, or port.

## 7. Seed Demo Data

Run:

```powershell
pnpm demo:seed
```

The seed is rerunnable. It recreates the demo business, user, stores, orders, products, customers, inventory snapshots, refunds, and sync cursors.

Demo login:

```text
Email: demo@salense.local
Password: DemoPassword123!
```

## 8. Start The API

In one PowerShell window:

```powershell
pnpm --filter @salense/api dev
```

The API listens on `http://localhost:3001`.

## 9. Start The Web App

In another PowerShell window:

```powershell
pnpm --filter @salense/web dev
```

Open:

```text
http://localhost:3000
```

## 10. Recommended Demo Walkthrough

1. Log in as `demo@salense.local`.
2. Open Today and show the Business Health Score, platform comparison, and deterministic Today Briefing.
3. Open Orders and confirm WooCommerce, Amazon Seller, Shopify, and TikTok Shop orders appear.
4. Open Products and confirm platform identity is preserved without automatic cross-platform merging.
5. Open Customers and show New Customers, Returning Customers, and Highest Lifetime Customer.
6. Open Inventory and show low stock, out of stock, inventory value, and deterministic stock insights.
7. Open Store Integrations and show all four supported platforms connected in demo mode.

## Private Access Flow

For pilot onboarding, use:

```text
Pricing -> Request invitation -> Admin review -> Approve -> Accept invitation -> Login
```

1. Submit a request at `http://localhost:3000/request-invitation`.
2. Sign in with the email configured as `PLATFORM_ADMIN_EMAIL`.
3. Open `http://localhost:3000/admin`.
4. Approve the request and copy the generated `/accept-invitation?token=...` link.
5. Open the invitation link, set a password, then sign in.

Invitation accounts are created with email verification complete because access has been approved
by an admin. Normal email verification remains available for future public registration.

## Troubleshooting

- PostgreSQL is reachable but Prisma fails: update `DATABASE_URL` to the correct local user, password, database, and port.
- Redis is not reachable: start your Redis-compatible service or WSL Redis server.
- API fails with credential encryption errors: confirm `SALENSE_CREDENTIAL_ENCRYPTION_KEY` is present and base64-decodes to 32 bytes.
- Login fails after setup: rerun `pnpm demo:seed`.
