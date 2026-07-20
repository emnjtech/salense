import { BadRequestException } from "@nestjs/common";
import { StoreIntegrationOAuthService } from "../store-integration-oauth.service.js";
import type { StoreIntegrationsService } from "../store-integrations.service.js";
import { StorePlatform } from "../types/store-platform.enum.js";

describe("StoreIntegrationOAuthService", () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-07-08T10:00:00.000Z"));
    process.env = {
      ...originalEnv,
      AMAZON_LWA_CLIENT_ID: "amazon-lwa-client-id",
      AMAZON_LWA_CLIENT_SECRET: "amazon-lwa-client-secret",
      AMAZON_SP_API_APP_ID: "amazon-app-id",
      AMAZON_SP_API_REDIRECT_URI: "https://api.salense.test/store-integrations/amazon-seller/oauth/callback",
      JWT_ACCESS_TOKEN_SECRET: "state-secret",
      PUBLIC_APP_URL: "https://app.salense.test",
      SHOPIFY_CLIENT_ID: "shopify-client-id",
      SHOPIFY_CLIENT_SECRET: "shopify-client-secret",
      SHOPIFY_REDIRECT_URI: "https://api.salense.test/store-integrations/shopify/oauth/callback",
      SHOPIFY_SCOPES: "read_orders,read_products,read_customers,read_inventory",
      TIKTOK_SHOP_APP_KEY: "tiktok-app-key",
      TIKTOK_SHOP_REDIRECT_URI: "https://api.salense.test/store-integrations/tiktok-shop/oauth/callback",
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
    jest.useRealTimers();
  });

  it("builds a Shopify authorization URL with read-only scopes and signed state", () => {
    const service = createService().service;

    const response = service.startShopifyOAuth("user_1", {
      shop: "northstar.myshopify.com",
      storeName: "Northstar Shopify",
    });
    const authorizationUrl = new URL(response.authorizationUrl);

    expect(response.platform).toBe(StorePlatform.Shopify);
    expect(response.stateExpiresAt).toBe("2026-07-08T10:10:00.000Z");
    expect(authorizationUrl.origin).toBe("https://northstar.myshopify.com");
    expect(authorizationUrl.pathname).toBe("/admin/oauth/authorize");
    expect(authorizationUrl.searchParams.get("client_id")).toBe("shopify-client-id");
    expect(authorizationUrl.searchParams.get("scope")).toBe(
      "read_orders,read_products,read_customers,read_inventory",
    );
    expect(authorizationUrl.searchParams.get("state")).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u);
  });

  it("exchanges a Shopify callback code and persists the received token through the existing connection path", async () => {
    const { prepareStoreConnection, service } = createService();
    const start = service.startShopifyOAuth("user_1", {
      shop: "northstar.myshopify.com",
      storeName: "Northstar Shopify",
    });
    const state = new URL(start.authorizationUrl).searchParams.get("state") ?? "";
    global.fetch = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>().mockResolvedValue({
      json: async () => ({ access_token: "shopify-access-token" }),
      ok: true,
    } as Response);

    await expect(service.handleShopifyCallback({ code: "auth-code", state })).resolves.toBe(
      "https://app.salense.test/store-integrations?connected=shopify",
    );

    expect(global.fetch).toHaveBeenCalledWith(
      "https://northstar.myshopify.com/admin/oauth/access_token",
      expect.objectContaining({ method: "POST" }),
    );
    expect(prepareStoreConnection).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({
        platform: StorePlatform.Shopify,
        shopifyCredentials: expect.objectContaining({
          accessToken: "shopify-access-token",
          shopDomain: "northstar.myshopify.com",
        }),
        storeName: "Northstar Shopify",
        storeUrl: "https://northstar.myshopify.com",
      }),
    );
  });

  it("rejects invalid Shopify callback state", async () => {
    const service = createService().service;

    await expect(
      service.handleShopifyCallback({ code: "auth-code", state: "invalid-state" }),
    ).rejects.toThrow(BadRequestException);
  });

  it("builds scaffold authorization URLs for Amazon Seller and TikTok Shop", () => {
    const service = createService().service;

    const amazon = service.startAmazonSellerOAuth("user_1", {
      region: "GB",
      storeName: "Amazon UK",
    });
    const tiktok = service.startTikTokShopOAuth("user_1", {
      region: "GB",
      storeName: "TikTok UK",
    });

    const amazonUrl = new URL(amazon.authorizationUrl);
    expect(amazonUrl.host).toBe("sellercentral-europe.amazon.com");
    expect(amazonUrl.searchParams.get("application_id")).toBe("amazon-app-id");
    expect(amazonUrl.searchParams.get("redirect_uri")).toBeNull();
    expect(new URL(tiktok.authorizationUrl).searchParams.get("app_key")).toBe("tiktok-app-key");
  });

  it("returns Amazon Seller Central handoff URL without consuming the Salense state", async () => {
    const service = createService().service;
    const start = service.startAmazonSellerOAuth("user_1", {
      region: "GB",
      storeName: "Amazon UK",
    });
    const state = new URL(start.authorizationUrl).searchParams.get("state") ?? "";

    await expect(
      service.handleAmazonSellerCallback({
        amazon_callback_uri: "https://sellercentral.amazon.co.uk/apps/authorize/confirm",
        amazon_state: "amazon-state",
        state,
      }),
    ).resolves.toBe("https://sellercentral.amazon.co.uk/apps/authorize/confirm?state=amazon-state");
  });

  it("exchanges Amazon Seller callback code and persists OAuth tokens through the existing connection path", async () => {
    const { prepareStoreConnection, service } = createService();
    const start = service.startAmazonSellerOAuth("user_1", {
      region: "GB",
      storeName: "Amazon UK",
    });
    const state = new URL(start.authorizationUrl).searchParams.get("state") ?? "";
    global.fetch = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>().mockResolvedValue({
      json: async () => ({
        access_token: "amazon-access-token",
        refresh_token: "amazon-refresh-token",
      }),
      ok: true,
    } as Response);

    await expect(
      service.handleAmazonSellerCallback({
        selling_partner_id: "A1SELLER",
        spapi_oauth_code: "spapi-code",
        state,
      }),
    ).resolves.toBe("https://app.salense.test/store-integrations?connected=amazon-seller");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.amazon.com/auth/o2/token",
      expect.objectContaining({ method: "POST" }),
    );
    expect(prepareStoreConnection).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({
        amazonSellerCredentials: {
          accessToken: "amazon-access-token",
          marketplaceId: "A1F83G8C2ARO7P",
          refreshToken: "amazon-refresh-token",
          sellerId: "A1SELLER",
        },
        platform: StorePlatform.AmazonSeller,
        region: "GB",
        storeName: "Amazon UK",
      }),
    );
  });
});

function createService(): {
  readonly prepareStoreConnection: jest.Mock;
  readonly service: StoreIntegrationOAuthService;
} {
  const prepareStoreConnection = jest.fn().mockResolvedValue({});
  const storeIntegrationsService = {
    prepareStoreConnection,
  } as unknown as StoreIntegrationsService;

  return {
    prepareStoreConnection,
    service: new StoreIntegrationOAuthService(storeIntegrationsService),
  };
}
