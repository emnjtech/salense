import {
  StorePlatform,
  WooCommerceApiVersion,
  createStoreIntegrationsApiClient,
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
});

function jsonResponse(body: unknown): Response {
  return {
    json: async () => body,
    ok: true,
    status: 200,
  } as Response;
}
