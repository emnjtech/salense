# MVP Demo Checklist

Use this checklist before and during an Innovator Founder demo.

## Before The Demo

- [ ] PostgreSQL is running.
- [ ] Redis is running.
- [ ] `DATABASE_URL`, `REDIS_URL`, JWT secrets, and `SALENSE_CREDENTIAL_ENCRYPTION_KEY` are set for the API and seed script.
- [ ] Prisma client is generated.
- [ ] Prisma schema is applied to the local database.
- [ ] `pnpm demo:seed` has completed successfully.
- [ ] API is running.
- [ ] Web app is running.
- [ ] Login works with `demo@salense.local` and `DemoPassword123!`.

## Demo Journey

- [ ] Today shows Business Health Score and multi-platform metrics.
- [ ] Orders shows seeded WooCommerce, Amazon Seller, TikTok Shop, and Shopify orders.
- [ ] Products shows seeded platform-scoped products.
- [ ] Customers shows summary cards and seeded customer rows.
- [ ] Inventory shows summary cards, stock insights, and seeded inventory rows.
- [ ] Store Integrations shows WooCommerce, Amazon Seller, TikTok Shop, and Shopify.

## Message Discipline

- [ ] Say Salense is read-only in Version 1.
- [ ] Say platform identity is preserved.
- [ ] Say products from different marketplaces are not automatically merged.
- [ ] Say analytics are deterministic.
- [ ] Do not claim AI, billing, roles, reports, or live marketplace APIs are implemented in this MVP.
