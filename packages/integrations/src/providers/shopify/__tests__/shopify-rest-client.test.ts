import {
  ConnectionHealthStatus,
  IntegrationAuthenticationError,
  ShopifyRestClient,
  type ShopifyRawOrder,
} from "../../../index.js";

const request = {
  accessToken: "shpat_test_access_token",
  apiVersion: "2024-10",
  shopDomain: "northstar-home.myshopify.com",
};

describe("ShopifyRestClient", () => {
  it("validates connections through a read-only shop request", async () => {
    const fetchFn = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ shop: { id: 1, name: "Northstar Home" } }));
    const client = new ShopifyRestClient({ fetchFn });

    await expect(client.validateConnection(request)).resolves.toMatchObject({
      status: ConnectionHealthStatus.Healthy,
    });

    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://northstar-home.myshopify.com/admin/api/2024-10/shop.json");
    expect(init?.method).toBe("GET");
    expect(init?.headers).toEqual(
      expect.objectContaining({
        Accept: "application/json",
        "X-Shopify-Access-Token": "shpat_test_access_token",
      }),
    );
  });

  it("reads paginated orders without write operations", async () => {
    const firstOrder: ShopifyRawOrder = { id: 1001 };
    const secondOrder: ShopifyRawOrder = { id: 1002 };
    const fetchFn = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValueOnce(
        jsonResponse(
          { orders: [firstOrder] },
          200,
          '<https://northstar-home.myshopify.com/admin/api/2024-10/orders.json?page_info=next>; rel="next"',
        ),
      )
      .mockResolvedValueOnce(jsonResponse({ orders: [secondOrder] }));
    const client = new ShopifyRestClient({ fetchFn });

    await expect(client.listOrders({ ...request, maxPages: 2 })).resolves.toEqual([
      firstOrder,
      secondOrder,
    ]);
    expect(fetchFn.mock.calls.map(([, init]) => init?.method)).toEqual(["GET", "GET"]);
    expect(String(fetchFn.mock.calls[1]?.[0])).toContain("page_info=next");
  });

  it("maps authentication failures to integration authentication errors", async () => {
    const fetchFn = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ errors: "Unauthorized" }, 401));
    const client = new ShopifyRestClient({ fetchFn });

    await expect(client.validateConnection(request)).rejects.toThrow(IntegrationAuthenticationError);
  });
});

function jsonResponse(body: unknown, status = 200, linkHeader: string | null = null): Response {
  return {
    headers: {
      get: (name: string) => (name.toLowerCase() === "link" ? linkHeader : null),
    },
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}
