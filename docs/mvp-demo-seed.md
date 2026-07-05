# MVP Demo Seed Data

The MVP demo seed creates a local multi-platform commerce dataset for the Innovator Founder demo journey.

## What It Creates

- One verified demo user
- One business profile: Northstar Home Goods
- One connected WooCommerce store
- One connected Amazon Seller store
- One connected TikTok Shop store
- One connected Shopify store
- Orders and order items across today, yesterday, and earlier history
- Products, customers, inventory snapshots, categories, refunds, and sync cursors

All commerce records preserve `businessId`, `connectedStoreId`, `platform`, source platform record IDs, and demo source metadata. Products remain platform-scoped; the seed does not match or merge products across stores or platforms.

## Demo Login

Email: `demo@salense.local`

Password: `DemoPassword123!`

The database stores only the bcrypt password hash. The seed does not store real marketplace credentials, marketplace passwords, access tokens, refresh tokens, or raw secrets.

## Run Locally

Set `DATABASE_URL` to a local PostgreSQL database that has the current Prisma schema applied, then run:

```bash
pnpm demo:seed
```

The script is rerunnable. It deletes the existing demo user by email and recreates that user's business, stores, and commerce data through cascade cleanup.

## Demo Shape

- Amazon Seller is the strongest platform for today's revenue.
- TikTok Shop contributes visible product velocity.
- Shopify contributes visible direct-store revenue, customers, inventory, and refund data.
- WooCommerce includes a partial refund for refund-count visibility.
- Low-stock and out-of-stock products are included for Today, Products, and Inventory page signals.
- Today and yesterday orders are included so revenue-change metrics are meaningful.
