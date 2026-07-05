import { UnauthorizedException } from "@nestjs/common";
import { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";
import { CommercePlatformsController } from "../commerce-platforms.controller.js";
import type { CommercePlatformsService } from "../commerce-platforms.service.js";

describe("CommercePlatformsController", () => {
  it("passes authenticated platform summary requests to the service", async () => {
    const service = {
      getPlatformSummary: jest.fn().mockResolvedValue({
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
    } as unknown as jest.Mocked<CommercePlatformsService>;
    const controller = new CommercePlatformsController(service);

    await expect(
      controller.getPlatformSummary(
        { headers: {}, user: { email: "owner@example.com", emailVerified: true, sub: "user_1" } },
        { platform: StorePlatform.Shopify },
      ),
    ).resolves.toMatchObject({ platform: StorePlatform.Shopify });

    expect(service.getPlatformSummary).toHaveBeenCalledWith("user_1", StorePlatform.Shopify);
  });

  it("rejects when authenticated context is missing", () => {
    const service = { getPlatformSummary: jest.fn() } as unknown as CommercePlatformsService;
    const controller = new CommercePlatformsController(service);

    expect(() =>
      controller.getPlatformSummary({ headers: {} }, { platform: StorePlatform.WooCommerce }),
    ).toThrow(UnauthorizedException);
  });
});
