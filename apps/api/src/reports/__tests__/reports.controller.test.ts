import { UnauthorizedException } from "@nestjs/common";
import { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";
import { ReportsController } from "../reports.controller.js";
import type { ReportsService } from "../reports.service.js";

describe("ReportsController", () => {
  it("passes authenticated overview requests and filters to the service", async () => {
    const service = {
      getOverview: jest.fn().mockResolvedValue({
        filters: {
          dateFrom: "2026-07-01T00:00:00.000Z",
          dateTo: "2026-07-05T23:59:59.999Z",
          platform: StorePlatform.Shopify,
          store: null,
        },
        inventory: { inventoryRisk: 0, inventoryValue: 0, lowStock: 0, outOfStock: 0 },
        kpis: {
          averageOrderValue: 0,
          businessHealthScore: 80,
          orders: 0,
          refunds: 0,
          revenue: 0,
        },
        ordersByPlatform: [],
        ordersTrend: [],
        revenueByPlatform: [],
        revenueTrend: [],
        stores: [],
        topCustomers: [],
        topProducts: [],
      }),
    } as unknown as jest.Mocked<ReportsService>;
    const controller = new ReportsController(service);
    const query = { platform: StorePlatform.Shopify };

    await expect(
      controller.getOverview(
        { headers: {}, user: { email: "owner@example.com", emailVerified: true, sub: "user_1" } },
        query,
      ),
    ).resolves.toMatchObject({ filters: { platform: StorePlatform.Shopify } });

    expect(service.getOverview).toHaveBeenCalledWith("user_1", query);
  });

  it("rejects when authenticated context is missing", () => {
    const service = { getOverview: jest.fn() } as unknown as ReportsService;
    const controller = new ReportsController(service);

    expect(() => controller.getOverview({ headers: {} }, {})).toThrow(UnauthorizedException);
  });
});
