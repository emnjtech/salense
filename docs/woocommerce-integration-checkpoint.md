# Phase 2 Backend Checkpoint: Store Integrations and WooCommerce Sync

This checkpoint records the current backend implementation status for Phase 2 against the Salense PRD/SES areas that govern store integrations, synchronisation, API/integration management, and audit history:

- Chapter 6.3 Store Integration Module
- Chapter 6.18 Audit Log Module
- Chapter 6.19 Data Synchronisation Engine
- Chapter 6.20 API & Integration Management
- Engineering Principle 001: Version 1 is read-only against connected commerce platforms

## Executive Status

The Phase 2 backend foundation is implemented for WooCommerce. It supports secure connection setup, read-only credential validation, normalised commerce persistence, queued and scheduled sync scaffolding, worker processing, disconnect lifecycle, audit logging, sync cursors, and backend sync-status visibility.

Amazon Seller and TikTok Shop remain bounded as supported Version 1 platform types, but their real connection, sync, disconnect, and status lifecycles are intentionally deferred.

No frontend dashboard, analytics, AI logic, billing, or roles/permissions work is included in this checkpoint.

## Implemented Capabilities

### Store Integration Lifecycle

- Supported-platform listing exists for WooCommerce, Amazon Seller, and TikTok Shop.
- Company/business ownership is required before connecting stores.
- Duplicate active/pending store connections are rejected.
- WooCommerce connection requests validate store URL, consumer key, consumer secret, and supported API version.
- WooCommerce admin or marketplace passwords are rejected by DTO validation.
- WooCommerce connection records move through `PENDING_VALIDATION`, `CONNECTED`, and `ERROR` during credential validation.
- WooCommerce disconnect is implemented for authenticated owners, marks the store `DISCONNECTED`, records `disconnectedAt`, removes recurring sync, and preserves imported history.

### WooCommerce Credential Handling and API Management

- WooCommerce consumer key and consumer secret are encrypted before persistence.
- API responses exclude plaintext credentials, encrypted credential payloads, credential hashes, token material, and raw marketplace payloads.
- Real WooCommerce credential validation uses a safe read-only REST request.
- API/integration provider boundaries exist in `packages/integrations`, with WooCommerce implemented and Amazon/TikTok remaining placeholders.

### Read-Only Synchronisation

- WooCommerce REST read clients exist for orders, products, customers, inventory/product stock fields, categories, and refunds.
- WooCommerce client methods use `GET` only.
- Tests assert write-style methods are not called.
- Sync jobs read, map, and persist Salense-owned records only; they do not mutate WooCommerce data.

### Normalised Commerce Persistence

- Prisma models exist for orders, order items, products, customers, inventory snapshots, categories, and refunds.
- Every imported commerce model preserves `businessId`, `connectedStoreId`, `platform`, platform record identifiers, source metadata where represented, `importedAt`, and `lastSyncedAt`.
- Upserts use platform/store-scoped uniqueness to prevent duplicate imports.
- Source platform identity is never merged away; no automatic cross-platform product/customer matching is implemented.

### Queue, Worker, and Scheduling

- Manual WooCommerce sync endpoint enqueues BullMQ jobs rather than running sync inline.
- Job types exist for manual full sync and resource-level WooCommerce sync.
- `apps/worker` bootstraps a sync worker that delegates to the API WooCommerce sync handler.
- Scheduled sync scaffolding uses recurring BullMQ jobs.
- Scheduling is explicit; connecting a store does not silently schedule every store.
- Recurring schedule removal is wired into WooCommerce disconnect.

### Audit Logging

- `AuditLog` persistence exists for permanent append-only audit records.
- WooCommerce lifecycle audit entries are recorded for:
  - connection created
  - validation success
  - validation failure
  - manual sync job queued
  - scheduled sync created
  - scheduled sync removed
  - store disconnected
- Audit entries include user id, business id, action, affected module, affected store, affected platform, result, timestamp, and safe metadata.
- Audit metadata is sanitised to exclude credentials, encrypted credentials, hashes, tokens, raw payloads, and other sensitive values.

### Sync Cursors and Status Visibility

- Per-store, per-resource cursors exist for orders, products, customers, inventory, categories, and refunds.
- Cursors store last successful sync time, last attempted sync time, status, and safe error metadata.
- WooCommerce sync reads cursors before resource syncs and uses incremental date parameters where WooCommerce supports them.
- WooCommerce categories are handled safely without date filtering because WooCommerce category incremental filtering is unsupported.
- Authenticated backend sync-status endpoint returns safe store status, resource cursor statuses, last sync times, safe error summaries, and available queued/running job state.

### Multi-Tenant Ownership and Source Integrity

- Store list, connect, disconnect, manual sync, sync job status, scheduled sync, schedule removal, and sync status paths enforce authenticated ownership.
- Users cannot act on stores belonging to another business.
- Imported historical commerce records are not deleted during disconnect.
- Version 1 remains read-only against WooCommerce, Amazon Seller, and TikTok Shop.

## Requirement Trace

| PRD/SES Area | Current Backend Status |
| --- | --- |
| Chapter 6.3 Add Store | Supported-platform listing and WooCommerce connection setup exist. Amazon/TikTok real setup deferred. |
| Chapter 6.3 Authentication | WooCommerce validates consumer credentials through read-only API. OAuth/official redirects for Amazon/TikTok deferred. |
| Chapter 6.3 Connection Status | Connected store statuses are modelled. Production rules for `SYNCHRONISING` and `AUTHENTICATION_EXPIRED` remain deferred. |
| Chapter 6.3 Synchronisation | WooCommerce initial/full and resource sync path exists for orders, products, customers, inventory, categories, and refunds. Settlements, returns, shipping status deferred. |
| Chapter 6.3 Manual Synchronisation | Protected endpoint enqueues WooCommerce sync jobs. |
| Chapter 6.3 Scheduled Synchronisation | Explicit recurring BullMQ scheduling scaffolding exists. Automatic scheduling policy deferred. |
| Chapter 6.3 Disconnect Store | WooCommerce disconnect revokes future scheduled sync and preserves historical data. Permanent deletion deferred. |
| Chapter 6.18 Audit Log | Store integration lifecycle audit persistence and safe metadata implemented. Audit UI/export/search deferred. |
| Chapter 6.19 Incremental Synchronisation | Per-resource cursors implemented; incremental reads used where WooCommerce supports them. Cursor reset/backfill policy deferred. |
| Chapter 6.19 Retry Failed Synchronisation | BullMQ job attempts/backoff configured. Operational retry policy and user-facing retry controls deferred. |
| Chapter 6.19 Conflict Detection | Duplicate import prevention and idempotent upserts implemented. Rich conflict workflows deferred. |
| Chapter 6.19 Rate Limiting | Errors are safely mapped. Adaptive throttling/quota management deferred. |
| Chapter 6.19 Token Refresh | Not implemented for WooCommerce; future platform-specific work. |
| Chapter 6.20 API Management | Provider contracts, registry/factory, WooCommerce API client, connection health validation, safe status surfaces implemented. Quota usage and API admin views deferred. |

## Required Environment Variables

### API

- `DATABASE_URL`: PostgreSQL connection string required by Prisma for live persistence.
- `JWT_ACCESS_TOKEN_SECRET`: Required by authentication/session services.
- `JWT_REFRESH_TOKEN_SECRET`: Required by authentication/session services.
- `JWT_ACCESS_TOKEN_EXPIRES_IN`: Access token lifetime.
- `JWT_REFRESH_TOKEN_EXPIRES_IN`: Refresh token lifetime.
- `CREDENTIAL_ENCRYPTION_KEY`: Required for WooCommerce credential encryption/decryption in live connection and sync flows.
- `REDIS_URL`: Required when API code enqueues, schedules, removes, or reads BullMQ sync jobs.
- `SYNC_SCHEDULE_INTERVAL_MS`: Optional recurring WooCommerce full-sync interval. Defaults to `3600000`; values below `300000` are rejected.

### Worker

- `REDIS_URL`: Required to start the sync worker. Supports `redis://` and `rediss://`.
- API package build output must be available because the worker loads the WooCommerce sync handler from `@salense/api/worker`.

## Operational Commands

Install dependencies:

```bash
pnpm install
```

Run quality checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run the API locally:

```bash
pnpm --filter @salense/api dev
```

Run the sync worker locally:

```bash
pnpm --filter @salense/worker dev
```

Run only API tests:

```bash
pnpm --filter @salense/api test
```

Run only worker tests:

```bash
pnpm --filter @salense/worker test
```

Run only integration package tests:

```bash
pnpm --filter @salense/integrations test
```

## Deferred Capabilities

- Amazon Seller real connection, credential validation, sync, disconnect, cursor, status, and audit lifecycles.
- TikTok Shop real connection, credential validation, sync, disconnect, cursor, status, and audit lifecycles.
- Frontend dashboard/progress UI for store integrations and sync status.
- Analytics and AI/business intelligence over imported commerce records.
- Billing and role/permission enforcement beyond current authenticated owner checks.
- OAuth/official redirect flows where required by future platform implementations.
- Automatic scheduling policy at connection time.
- Permanent store deletion workflow and user-controlled historical data deletion.
- Returns, shipping status, settlements, taxes, discounts, and coupons persistence/sync.
- API quota usage views, connection history UI, and administrator integration management dashboards.
- Audit search/export UI.

## Remaining Risks and Hardening Items

- Production credential key management and rotation need operational design.
- Redis outage behavior needs product decisions for sync enqueue/status responses.
- Cursor reset/backfill controls are not implemented.
- Long-running incremental window strategy is not implemented.
- Adaptive rate-limit handling and WooCommerce throttling policy are not implemented.
- User notification for failed sync, expired credentials, and store disconnection is deferred.
- `SYNCHRONISING` and `AUTHENTICATION_EXPIRED` state transitions need production lifecycle rules.
- Audit retention/legal deletion policy is not implemented beyond append-only service behavior.
- BullMQ retry attempts exist, but product-level retry visibility and manual retry controls remain deferred.

## Test Coverage Summary

Current tests cover:

- DTO validation for supported platforms and rejected password fields.
- WooCommerce credential validation success/failure and safe responses.
- Read-only WooCommerce HTTP behavior, pagination, and incremental query parameters.
- Raw-to-normalised mapper source metadata preservation.
- Idempotent persistence and commerce relationship handling.
- WooCommerce sync service read, map, persist, cursor, and read-only behavior.
- Manual sync queueing and safe job status responses.
- Worker dispatch and safe failure handling.
- Scheduled sync creation, duplicate prevention, removal, and safe metadata.
- WooCommerce disconnect ownership, schedule removal, safe response, and historical-data preservation.
- Audit entry creation and sensitive metadata redaction.
- Sync cursor success/failure state and safe failure metadata.
- Sync status endpoint ownership, cursor sanitisation, job status mapping, and credential exclusion.
- Database schema assertions for commerce data, audit logs, and sync cursors.

No new tests were required during this checkpoint review because the reviewed backend capabilities already have targeted unit/schema coverage.
