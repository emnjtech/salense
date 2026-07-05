import { createReportsApiClient } from "../api/reports-client";
import { StorePlatform } from "../api/store-integrations-client";

describe("reports API client", () => {
  it("loads filtered reports with bearer authentication", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse(reportsOverviewResponse()));
    const client = createReportsApiClient({
      baseUrl: "https://api.salense.test/",
      fetchImpl,
    });

    await client.getOverview("access-token", {
      dateFrom: "2026-07-01T00:00:00.000Z",
      dateTo: "2026-07-05T23:59:59.999Z",
      platform: StorePlatform.Shopify,
      store: "store_1",
    });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://api.salense.test/reports/overview?dateFrom=2026-07-01T00%3A00%3A00.000Z&dateTo=2026-07-05T23%3A59%3A59.999Z&platform=SHOPIFY&store=store_1",
    );
    expect(getAuthorization(fetchImpl.mock.calls[0]?.[1])).toBe("Bearer access-token");
  });

  it("maps API errors safely", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ message: "Unauthorized" }, false, 401));
    const client = createReportsApiClient({ baseUrl: "https://api.salense.test", fetchImpl });

    await expect(client.getOverview("expired-token")).rejects.toThrow("Unauthorized");
  });
});

function reportsOverviewResponse() {
  return {
    filters: {
      dateFrom: "2026-07-01T00:00:00.000Z",
      dateTo: "2026-07-05T23:59:59.999Z",
      platform: StorePlatform.Shopify,
      store: "store_1",
    },
    inventory: { inventoryRisk: 1, inventoryValue: 1000, lowStock: 1, outOfStock: 0 },
    kpis: {
      averageOrderValue: 120,
      businessHealthScore: 82,
      orders: 3,
      refunds: 1,
      revenue: 360,
    },
    ordersByPlatform: [{ platform: StorePlatform.Shopify, value: 3 }],
    ordersTrend: [{ date: "2026-07-01", value: 3 }],
    revenueByPlatform: [{ platform: StorePlatform.Shopify, value: 360 }],
    revenueTrend: [{ date: "2026-07-01", value: 360 }],
    stores: [{ id: "store_1", platform: StorePlatform.Shopify, storeName: "Shopify London" }],
    topCustomers: [],
    topProducts: [],
  };
}

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
