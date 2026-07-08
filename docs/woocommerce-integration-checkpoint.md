# Multi-Platform MVP Integration Checkpoint

This checkpoint records the current implementation status for the Salense MVP integration layer against the PRD/SES areas governing store integrations, synchronization, source integrity, security, and read-only commerce intelligence.

Covered Version 1 platforms:

- WooCommerce
- Amazon Seller
- TikTok Shop
- Shopify

## Executive Status

WooCommerce, Amazon Seller, TikTok Shop, and Shopify now share the MVP integration path. Each platform appears in Store Integrations, accepts platform-specific credentials, validates connections through a read-only provider/client path, supports manual sync, supports recurring sync scheduling, exposes safe sync status, and maps marketplace reads into normalized commerce tables.

The MVP remains read-only. Salense does not create, update, delete, fulfil, or otherwise mutate marketplace records.

## Parity Summary

| Capability | WooCommerce | Amazon Seller | TikTok Shop | Shopify |
| --- | --- | --- | --- | --- |
| Store Integrations UI visibility | Implemented | Implemented | Implemented | Implemented |
| Credential input | Implemented | Implemented | Implemented | Implemented |
| Secure credential storage | Implemented | Implemented | Implemented | Implemented |
| Connection validation | Implemented | Implemented | Implemented | Implemented |
| Read-only client | Implemented | Implemented | Implemented | Implemented |
| Manual sync queueing | Implemented | Implemented | Implemented | Implemented |
| Scheduled sync | Implemented | Implemented | Implemented | Implemented |
| Worker routing | Implemented | Implemented | Implemented | Implemented |
| Sync cursors | Implemented | Implemented | Implemented | Implemented |
| Sync status endpoint | Implemented | Implemented | Implemented | Implemented |
| Audit events | Implemented | Implemented | Implemented | Implemented |
| Normalized commerce persistence | Implemented | Implemented | Implemented | Implemented |

## Commerce Aggregation

The following MVP modules aggregate normalized data across WooCommerce, Amazon Seller, TikTok Shop, and Shopify by default, while preserving platform identity and business ownership:

- Today
- Orders
- Products
- Customers
- Inventory

Platform filters narrow results when requested, but business-wide views are not hard-coded to a single marketplace.

## Source Integrity

Normalized records preserve:

- `businessId`
- `connectedStoreId`
- `platform`
- platform-native record identifiers
- import and sync timestamps
- source metadata for internal traceability

Products from different marketplaces are not automatically merged. Platform identity remains part of every normalized commerce path.

## Security And Exposure Rules

API responses and UI clients must not expose:

- plaintext credentials
- encrypted credential payloads
- credential hashes
- tokens or secrets
- raw marketplace payloads

Raw/source metadata may be retained internally for traceability and deterministic extraction, but customer-facing commerce endpoints return normalized, safe fields only.

## Read-Only Boundary

Marketplace clients and sync services are limited to read and persistence operations inside Salense. Marketplace write operations are outside the MVP and must not be introduced without an explicit product decision.

Out of scope for this checkpoint:

- AI
- billing
- roles
- reports
- forecasting
- marketplace write operations
- live demo dependency on real marketplace credentials

## Test Coverage Summary

Current automated coverage includes:

- provider registration for all four MVP platforms
- DTO validation for supported platforms and credential shapes
- secure credential encryption and safe response behavior
- read-only REST client behavior
- raw-to-normalized mapper behavior
- sync service read, map, persist, cursor, and audit behavior
- manual sync job queueing
- scheduled sync creation for WooCommerce, Amazon Seller, TikTok Shop, and Shopify
- worker routing for all four platforms
- sync status safe response handling
- commerce aggregation tests for multi-platform dashboard, orders, products, customers, and inventory paths

## Remaining Differences

Store Integrations now presents authorization-first platform cards and keeps credential forms under Advanced manual setup. Shopify has an OAuth start/callback foundation that exchanges authorization codes for read-only Admin API tokens. Amazon Seller and TikTok Shop have authorization start/callback state handling ready for approved marketplace app credentials. WooCommerce remains guided through read-only REST API key creation with manual fallback.

See [Store authorization setup](./store-authorization-setup.md) for platform app configuration, redirect URLs, and remaining marketplace approval requirements.
