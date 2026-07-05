import { createPlatformsApiClient } from "../api/platforms-client";
import { StorePlatform } from "../api/store-integrations-client";

describe("platforms API client", () => {
  it("loads a platform summary with bearer authentication", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(
        jsonResponse({
          connectedStores: [],
          inventoryAlerts: [],
          metrics: {
            averageOrderValue: 0,
            lowStockCount: 0,
            orders: 0,
            productsSold: 0,
            refunds: 0,
            revenue: 0,
          },
          platform: StorePlatform.Shopify,
          platformName: "Shopify",
          recentOrders: [],
          syncStatus: [],
          topProducts: [],
        }),
      );
    const client = createPlatformsApiClient({
      baseUrl: "https://api.salense.test/",
      fetchImpl,
    });

    await client.getPlatformSummary("access-token", StorePlatform.Shopify);

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://api.salense.test/commerce/platforms/SHOPIFY/summary",
    );
    expect(getAuthorization(fetchImpl.mock.calls[0]?.[1])).toBe("Bearer access-token");
  });

  it("maps API errors safely", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ message: "Unsupported platform" }, false, 400));
    const client = createPlatformsApiClient({ baseUrl: "https://api.salense.test", fetchImpl });

    await expect(client.getPlatformSummary("access-token", StorePlatform.Shopify)).rejects.toThrow(
      "Unsupported platform",
    );
  });
});

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    json: async () => body,
    ok,
    status,
  } as Response;
}

function getAuthorization(init: RequestInit | undefined): string | null {
  return new Headers(init?.headers).get("authorization");
}
