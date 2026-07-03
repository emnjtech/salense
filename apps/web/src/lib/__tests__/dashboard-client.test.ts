import { createDashboardApiClient } from "../api/dashboard-client";
import { StorePlatform } from "../api/store-integrations-client";

describe("dashboard API client", () => {
  it("loads the Today dashboard with bearer authentication", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse(todayDashboardResponse()));
    const client = createDashboardApiClient({
      baseUrl: "https://api.salense.test/",
      fetchImpl,
    });

    const dashboard = await client.getTodayDashboard("access-token");

    expect(fetchImpl).toHaveBeenCalledWith("https://api.salense.test/dashboard/today", {
      headers: {
        authorization: "Bearer access-token",
      },
    });
    expect(dashboard.todayRevenue).toBe(1250);
    expect(dashboard.connectedPlatforms).toEqual([StorePlatform.WooCommerce]);
  });

  it("maps API error messages safely", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ message: "Unauthorized" }, false, 401));
    const client = createDashboardApiClient({ baseUrl: "https://api.salense.test", fetchImpl });

    await expect(client.getTodayDashboard("expired-token")).rejects.toThrow("Unauthorized");
  });
});

function todayDashboardResponse() {
  return {
    activeStores: 1,
    averageOrderValueToday: 125,
    basicBusinessHealthScore: 82,
    basicRuleBasedInsights: [
      {
        message: "WooCommerce is leading revenue today.",
        severity: "SUCCESS",
        type: "REVENUE",
      },
    ],
    bestPlatformToday: StorePlatform.WooCommerce,
    connectedPlatforms: [StorePlatform.WooCommerce],
    lowStockCount: 2,
    ordersByPlatform: [{ platform: StorePlatform.WooCommerce, value: 10 }],
    ordersToday: 10,
    productsSoldToday: 18,
    refundCountToday: 1,
    revenueByPlatform: [{ platform: StorePlatform.WooCommerce, value: 1250 }],
    revenueChangePercent: 25,
    todayRevenue: 1250,
    topProductToday: {
      name: "Starter Bundle",
      platform: StorePlatform.WooCommerce,
      quantitySold: 4,
      revenue: 400,
      sku: "SKU-1",
    },
    yesterdayRevenue: 1000,
  };
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    json: async () => body,
    ok,
    status,
  } as Response;
}
