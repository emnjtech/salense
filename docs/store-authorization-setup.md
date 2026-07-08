# Store Authorization Setup

Salense connects stores through platform authorization first, with manual credential setup kept as an advanced fallback. Version 1 remains read-only: Salense requests read scopes, stores tokens encrypted, and never modifies marketplace data.

## Shopify OAuth

Configure a Shopify app with this redirect URL:

```text
http://localhost:3001/store-integrations/shopify/oauth/callback
```

Set:

```bash
SHOPIFY_CLIENT_ID=""
SHOPIFY_CLIENT_SECRET=""
SHOPIFY_SCOPES="read_orders,read_products,read_customers,read_inventory"
SHOPIFY_REDIRECT_URI="http://localhost:3001/store-integrations/shopify/oauth/callback"
PUBLIC_APP_URL="http://localhost:3000"
```

The Store Integrations page asks for the shop domain, redirects the merchant to Shopify, validates the returned state, exchanges the authorization code for an Admin API access token, and stores that token through the existing encrypted credential path.

## WooCommerce

WooCommerce supports a REST API key authorization flow, but local merchant testing is clearer with guided read-only key creation:

1. Open WooCommerce admin.
2. Go to Settings, Advanced, REST API.
3. Create a key with read-only permissions.
4. Enter the consumer key and consumer secret under Advanced manual setup in Salense.

Salense encrypts the key material and validates the connection through the existing WooCommerce read client.

## Amazon Seller

Amazon Seller authorization requires an approved SP-API application and Login With Amazon configuration. Set these when available:

```bash
AMAZON_LWA_CLIENT_ID=""
AMAZON_LWA_CLIENT_SECRET=""
AMAZON_SP_API_REDIRECT_URI="http://localhost:3001/store-integrations/amazon-seller/oauth/callback"
AMAZON_SP_API_APP_ID=""
```

Salense includes OAuth start and callback state handling. Token exchange is intentionally left behind the approved SP-API application setup. Advanced manual setup remains available for controlled testing with existing valid tokens.

## TikTok Shop

TikTok Shop authorization requires an approved TikTok Shop app. Set these when available:

```bash
TIKTOK_SHOP_APP_KEY=""
TIKTOK_SHOP_APP_SECRET=""
TIKTOK_SHOP_REDIRECT_URI="http://localhost:3001/store-integrations/tiktok-shop/oauth/callback"
```

Salense includes OAuth start and callback state handling. Token exchange is intentionally left behind approved TikTok app setup. Advanced manual setup remains available for controlled testing with existing valid tokens.

## Security Notes

- OAuth state is random, signed, short-lived, and single-use.
- Tokens are never exposed to the browser after callback.
- Marketplace token material is stored only through the encrypted credential path.
- Manual setup fields stay hidden by default under Advanced manual setup.
