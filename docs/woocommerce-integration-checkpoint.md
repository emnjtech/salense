# WooCommerce Integration Checkpoint

This checkpoint maps the current WooCommerce integration work to PRD/SES Chapter 6.3 Store Integration and Chapter 6.19 Data Synchronisation Engine.

## Current Status

Implemented foundation:

- Supported-platform boundaries for WooCommerce, Amazon Seller, and TikTok Shop.
- WooCommerce credential request validation without marketplace/admin password fields.
- Encrypted credential metadata storage for WooCommerce consumer key and consumer secret.
- Read-only WooCommerce credential validation through a safe REST API request.
- Connected store records with `PENDING_VALIDATION`, `CONNECTED`, and `ERROR` outcomes during WooCommerce connection setup.
- Read-only WooCommerce clients for orders, products, customers, inventory, categories, and refunds.
- Raw-to-normalised WooCommerce mappers that preserve platform identity and source metadata.
- Idempotent persistence for normalised commerce records using platform-scoped identifiers.
- Protected manual sync endpoint that enqueues BullMQ jobs instead of running sync inline.
- Worker bootstrap that processes WooCommerce sync jobs through the existing sync service.
- Explicit scheduled sync scaffolding with recurring BullMQ jobs.
- Protected WooCommerce disconnect lifecycle that removes future scheduled sync and preserves imported history.

## Read-Only Principle

Version 1 remains read-only.

- WooCommerce REST client methods use `GET` only.
- Tests assert write methods such as `POST`, `PUT`, `PATCH`, and `DELETE` are not used by the read client.
- Sync jobs read, map, and persist Salense-owned records; they do not mutate WooCommerce orders, products, prices, or inventory.
- Scheduled sync uses the same read-only worker path as manual sync.

## Source Integrity

Source integrity is preserved by design:

- Every commerce model stores `businessId`, `connectedStoreId`, `platform`, and the platform record ID.
- Raw WooCommerce payloads are preserved in source metadata where represented.
- Original currencies and transaction values are mapped into Salense records without cross-platform merging.
- Products, customers, orders, refunds, categories, and inventory snapshots remain scoped to the connected store.
- Upserts use platform-scoped unique constraints to prevent duplicate imports.

## Store Lifecycle

Current lifecycle behavior:

- Company profile ownership is required before connection setup.
- Duplicate active/pending store connections are rejected.
- WooCommerce connections are created as pending, then marked connected after credential validation or error after validation failure.
- Manual sync requires an authenticated owner, platform `WOOCOMMERCE`, and status `CONNECTED`.
- Scheduled sync must be explicitly requested and also requires a connected WooCommerce store.
- WooCommerce disconnect requires an authenticated owner, requires a connected store, removes any recurring sync schedule, marks the store `DISCONNECTED`, and records `disconnectedAt`.
- Disconnect does not delete imported commerce records or call WooCommerce write APIs.

Deferred lifecycle work:

- Amazon Seller and TikTok Shop disconnect remain explicit future work until their connection lifecycles exist.
- Permanent deletion is not implemented; historical analytics are preserved by default.
- `SYNCHRONISING` and `AUTHENTICATION_EXPIRED` transitions need production lifecycle rules.
- User-facing platform-specific error surfaces remain to be refined.

## Credential Handling

Current safeguards:

- WooCommerce admin or marketplace passwords are not accepted by DTO validation.
- Consumer credentials are encrypted before persistence.
- Plaintext credentials are only used transiently for validation and read client construction.
- API responses exclude plaintext credentials, encrypted credential payloads, and credential hashes.
- Worker and queue status responses avoid credential material.

Remaining hardening:

- Production key management and rotation for credential encryption.
- Secret redaction standards for centralized logs and observability.
- Connection health history and user notification for expired credentials.

## Manual Sync

Current manual sync flow:

1. Authenticated user requests sync for a connected store.
2. API verifies store ownership, platform, and connection status.
3. API enqueues a WooCommerce full-sync BullMQ job.
4. Worker resolves the WooCommerce sync handler.
5. Sync service decrypts credentials, performs read-only WooCommerce reads, maps raw records, persists normalised records, and updates `lastSynchronisedAt`.

The manual sync response returns only safe job metadata: job id, store id, platform, status, and queued time.

## Scheduled Sync

Current scheduled sync scaffolding:

- `REDIS_URL` configures BullMQ queue and worker Redis access.
- `SYNC_SCHEDULE_INTERVAL_MS` configures the recurring WooCommerce full-sync interval and defaults to `3600000` milliseconds.
- Intervals below `300000` milliseconds are rejected.
- Scheduling is explicit; connecting a store does not silently schedule every store.
- Duplicate recurring schedules are prevented with deterministic WooCommerce recurring job ids.
- Schedule removal returns safe metadata and does not expose credentials.
- WooCommerce disconnect invokes schedule removal so disconnected stores do not continue future automatic synchronisation.

Remaining scheduled sync work:

- Product decision for when to automatically create schedules.
- Admin/user controls for schedule interval selection.
- Robust production monitoring of delayed, failed, and retried jobs.
- Backfill/retry policy for missed schedules.

## Chapter 6.19 Gaps

Implemented or scaffolded:

- Initial/full sync path for WooCommerce resources currently represented.
- Manual sync via queued jobs.
- Scheduled sync scaffolding through recurring BullMQ jobs.
- Duplicate import prevention through unique constraints and upserts.
- Failed job retry attempts at the BullMQ job level.
- Audit logging for WooCommerce connection creation, validation success/failure, manual sync queueing, scheduled sync creation/removal, and store disconnection.

Remaining gaps:

- Incremental sync orchestration based on previous `lastSynchronisedAt` is not wired into queued jobs yet.
- Retry failed synchronisation needs operational policy and user-visible status.
- Conflict detection rules beyond idempotent upsert are not implemented.
- Rate limiting strategy is limited to safe error mapping; no adaptive throttling yet.
- Token refresh is not implemented for WooCommerce and will differ by platform.
- Settlements, returns, and shipping status are not modelled or synchronised yet.
- Audit UI, audit export, and wider audit coverage outside the WooCommerce lifecycle are not implemented.

## Test Coverage

Major behavior currently covered:

- DTO validation rejects password fields and unsupported platform data.
- Credential validation and safe connection responses.
- Read-only WooCommerce HTTP behavior and pagination/incremental query parameters.
- Raw-to-normalised mapper source metadata preservation.
- Idempotent persistence and relationship handling.
- Manual sync queueing and safe job status responses.
- WooCommerce disconnect ownership enforcement, schedule removal, safe response, and historical-data preservation.
- Store integration audit entries and sensitive metadata redaction.
- Worker handler dispatch and safe result sanitisation.
- Scheduled sync creation, duplicate prevention, invalid store rejection, removal, and safe responses.
