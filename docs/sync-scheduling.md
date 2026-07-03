# Sync Scheduling

WooCommerce scheduled synchronisation is scaffolded through BullMQ recurring jobs.

Required runtime variables:

- `REDIS_URL`: Redis connection URL used by BullMQ queues and workers. Supports `redis://` and `rediss://`.
- `SYNC_SCHEDULE_INTERVAL_MS`: Optional interval for recurring WooCommerce full sync jobs. Defaults to `3600000` milliseconds. Values below `300000` milliseconds are rejected.

Scheduling is explicit. Connecting a store does not silently create a recurring job yet.

Version 1 remains read-only: scheduled jobs call the existing WooCommerce sync worker and must not write to WooCommerce.

See [WooCommerce integration checkpoint](./woocommerce-integration-checkpoint.md) for the wider Phase 2 status and remaining synchronisation gaps.
