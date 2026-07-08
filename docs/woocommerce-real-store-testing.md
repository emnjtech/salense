# WooCommerce Real-Store Testing

Use this runbook when validating a live WooCommerce store from a local Salense workspace.

## Required Environment

Set the same values in the API and worker terminals:

```powershell
$env:DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/salense_dev"
$env:REDIS_URL="redis://localhost:6379"
$env:SALENSE_CREDENTIAL_ENCRYPTION_KEY="base64-encoded-32-byte-key"
$env:JWT_ACCESS_TOKEN_SECRET="local-access-secret"
$env:JWT_REFRESH_TOKEN_SECRET="local-refresh-secret"
$env:JWT_ACCESS_TOKEN_EXPIRES_IN="15m"
$env:JWT_REFRESH_TOKEN_EXPIRES_IN="30d"
```

`SALENSE_CREDENTIAL_ENCRYPTION_KEY` must be identical in the API and worker sessions. If it changes after connecting a store, the worker cannot decrypt the stored WooCommerce keys.

## Create WooCommerce Read-Only Keys

1. Open the WordPress admin for the WooCommerce store.
2. Go to **WooCommerce**.
3. Open **Settings**.
4. Open **Advanced**.
5. Open **REST API**.
6. Choose **Add key**.
7. Set a clear description such as `Salense read-only`.
8. Choose the store owner user.
9. Set permissions to **Read**.
10. Generate the key.
11. Copy the consumer key and consumer secret.

Salense only uses read-only WooCommerce endpoints. It does not create orders, edit products, update inventory, or write back to the store.

## Start Local Services

Start the API:

```powershell
pnpm --filter @salense/api dev
```

Start the web app:

```powershell
pnpm --filter @salense/web dev
```

Start the sync worker:

```powershell
pnpm --filter @salense/worker dev
```

Keep all three terminals running. The API queues sync jobs, Redis stores the queue, and the worker imports WooCommerce data into normalized commerce tables.

## Connect WooCommerce

1. Sign in to Salense.
2. Open **Store Integrations**.
3. Open **Connect WooCommerce**.
4. Open **Advanced manual setup**.
5. Enter:
   - Store name
   - Store URL, for example `https://store.example.com`
   - Consumer key
   - Consumer secret
6. Submit the form.

Expected result:

- The store appears once in Connected Stores.
- Disconnected stores do not appear in active views.
- The first read-only sync is queued automatically.

## Run Or Retry Sync

If the first sync has not completed, click **Sync** or **Retry sync** on the WooCommerce store row.

Store Integrations should show:

- connection status
- last sync time
- latest job status
- latest safe failure reason, if any

Safe failure examples:

- `WooCommerce rejected the credentials. Check the read-only REST API key and secret.`
- `The WooCommerce store URL could not be reached. Check the URL and store availability.`
- `The worker could not decrypt stored credentials. Restart API and worker with the same encryption key.`

## Verify Imported Data

After a successful sync, verify:

1. **Today** activates from synchronized data.
2. **Orders** shows WooCommerce orders.
3. **Products** shows WooCommerce products.
4. **Customers** shows WooCommerce customers.
5. **Inventory** shows WooCommerce stock data.
6. **Reports** shows historical WooCommerce analytics.
7. **Store Integrations** shows updated sync cursors and `Last synchronised`.

If the WooCommerce store has no orders, products, customers, or stock data for the synced range, Salense should show empty states rather than fabricated analytics.

