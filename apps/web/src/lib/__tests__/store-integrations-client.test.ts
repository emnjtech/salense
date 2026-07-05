import {
  StorePlatform,
  WooCommerceApiVersion,
  createStoreIntegrationsApiClient,
  toAmazonSellerConnectionPayload,
  toShopifyConnectionPayload,
  toTikTokShopConnectionPayload,
  toWooCommerceConnectionPayload,
} from "../api/store-integrations-client";

describe("store integrations API client", () => {
  it("sends bearer authentication for protected requests", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse([]));
    const client = createStoreIntegrationsApiClient({
      accessTokenProvider: () => "access-token",
      baseUrl: "https://api.salense.test",
      fetchImpl,
    });

    await client.listConnectedStores();

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.salense.test/store-integrations/stores",
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
    const [, init] = fetchImpl.mock.calls[0] ?? [];
    expect((init?.headers as Headers).get("authorization")).toBe("Bearer access-token");
  });

  it("builds WooCommerce connection payloads without marketplace password fields", () => {
    const payload = toWooCommerceConnectionPayload({
      apiVersion: WooCommerceApiVersion.WcV3,
      consumerKey: " ck_test ",
      consumerSecret: " cs_test ",
      storeName: " Test Store ",
      storeUrl: " https://store.test ",
    });

    expect(payload).toEqual({
      platform: StorePlatform.WooCommerce,
      storeName: "Test Store",
      storeUrl: "https://store.test",
      wooCommerceCredentials: {
        apiVersion: WooCommerceApiVersion.WcV3,
        consumerKey: "ck_test",
        consumerSecret: "cs_test",
      },
    });
    expect(JSON.stringify(payload).toLowerCase()).not.toContain("password");
  });

  it("builds Amazon Seller connection payloads without marketplace password fields", () => {
    const payload = toAmazonSellerConnectionPayload({
      accessToken: " access-token ",
      marketplaceId: " A1F83G8C2ARO7P ",
      refreshToken: " refresh-token ",
      region: " gb ",
      sellerId: " seller-id ",
      storeName: " Amazon UK ",
    });

    expect(payload).toEqual({
      amazonSellerCredentials: {
        accessToken: "access-token",
        marketplaceId: "A1F83G8C2ARO7P",
        refreshToken: "refresh-token",
        sellerId: "seller-id",
      },
      platform: StorePlatform.AmazonSeller,
      region: "GB",
      storeName: "Amazon UK",
    });
    expect(JSON.stringify(payload).toLowerCase()).not.toContain("password");
  });

  it("builds TikTok Shop connection payloads without marketplace password fields", () => {
    const payload = toTikTokShopConnectionPayload({
      accessToken: " access-token ",
      refreshToken: " refresh-token ",
      region: " gb ",
      shopCipher: " shop-cipher ",
      shopId: " shop-id ",
      storeName: " TikTok UK ",
    });

    expect(payload).toEqual({
      platform: StorePlatform.TikTokShop,
      region: "GB",
      storeName: "TikTok UK",
      tikTokShopCredentials: {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        shopCipher: "shop-cipher",
        shopId: "shop-id",
      },
    });
    expect(JSON.stringify(payload).toLowerCase()).not.toContain("password");
  });

  it("builds Shopify connection payloads without marketplace password fields", () => {
    const payload = toShopifyConnectionPayload({
      accessToken: " shpat_test_access_token ",
      apiVersion: " 2024-10 ",
      shopDomain: " northstar-home.myshopify.com ",
      storeName: " Shopify UK ",
      storeUrl: " https://northstar-home.myshopify.com ",
    });

    expect(payload).toEqual({
      platform: StorePlatform.Shopify,
      shopifyCredentials: {
        accessToken: "shpat_test_access_token",
        apiVersion: "2024-10",
        shopDomain: "northstar-home.myshopify.com",
      },
      storeName: "Shopify UK",
      storeUrl: "https://northstar-home.myshopify.com",
    });
    expect(JSON.stringify(payload).toLowerCase()).not.toContain("password");
  });
});

function jsonResponse(body: unknown): Response {
  return {
    json: async () => body,
    ok: true,
    status: 200,
  } as Response;
}
