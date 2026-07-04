import {
  ConnectionHealthStatus,
  IntegrationAuthenticationError,
  TikTokShopApiRegion,
  TikTokShopRestClient,
  type TikTokShopRawOrder,
} from "../../../index.js";

const request = {
  accessToken: "access-token",
  region: TikTokShopApiRegion.Europe,
  shopCipher: "shop_cipher_123",
  shopId: "shop_123",
};

describe("TikTokShopRestClient", () => {
  it("validates connections through a read-only shop request", async () => {
    const fetchFn = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ code: 0, data: { shops: [] } }));
    const client = new TikTokShopRestClient({ fetchFn });

    await expect(client.validateConnection(request)).resolves.toMatchObject({
      status: ConnectionHealthStatus.Healthy,
    });

    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(String(url)).toContain("/authorization/202309/shops");
    expect(String(url)).toContain("shop_cipher=shop_cipher_123");
    expect(init?.method).toBe("GET");
    expect(init?.headers).toEqual(
      expect.objectContaining({
        Authorization: "Bearer access-token",
        "x-tts-access-token": "access-token",
      }),
    );
  });

  it("reads paginated orders without write operations", async () => {
    const firstOrder: TikTokShopRawOrder = { id: "order_1" };
    const secondOrder: TikTokShopRawOrder = { id: "order_2" };
    const fetchFn = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValueOnce(
        jsonResponse({ code: 0, data: { next_page_token: "next", orders: [firstOrder] } }),
      )
      .mockResolvedValueOnce(jsonResponse({ code: 0, data: { orders: [secondOrder] } }));
    const client = new TikTokShopRestClient({ fetchFn });

    await expect(client.listOrders({ ...request, maxPages: 2 })).resolves.toEqual([
      firstOrder,
      secondOrder,
    ]);
    expect(fetchFn.mock.calls.map(([, init]) => init?.method)).toEqual(["GET", "GET"]);
    expect(String(fetchFn.mock.calls[1]?.[0])).toContain("page_token=next");
  });

  it("maps authentication failures to integration authentication errors", async () => {
    const fetchFn = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ message: "Unauthorized" }, 401));
    const client = new TikTokShopRestClient({ fetchFn });

    await expect(client.validateConnection(request)).rejects.toThrow(IntegrationAuthenticationError);
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return {
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}
