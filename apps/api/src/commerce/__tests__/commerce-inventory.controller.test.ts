import { UnauthorizedException } from "@nestjs/common";
import { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";
import { CommerceInventoryController } from "../commerce-inventory.controller.js";
import type { CommerceInventoryService } from "../commerce-inventory.service.js";

describe("CommerceInventoryController", () => {
  it("passes authenticated requests and filters to the service", async () => {
    const service = {
      listInventory: jest.fn().mockResolvedValue({
        insights: [],
        inventory: [],
        summary: { inventoryValue: 0, lowStockProducts: 0, outOfStockProducts: 0 },
      }),
    } as unknown as jest.Mocked<CommerceInventoryService>;
    const controller = new CommerceInventoryController(service);
    const query = { platform: StorePlatform.WooCommerce, search: "lamp", stockStatus: "lowstock" };

    await expect(
      controller.listInventory(
        { headers: {}, user: { email: "owner@example.com", emailVerified: true, sub: "user_1" } },
        query,
      ),
    ).resolves.toEqual({
      insights: [],
      inventory: [],
      summary: { inventoryValue: 0, lowStockProducts: 0, outOfStockProducts: 0 },
    });

    expect(service.listInventory).toHaveBeenCalledWith("user_1", query);
  });

  it("rejects when authenticated context is missing", () => {
    const service = { listInventory: jest.fn() } as unknown as CommerceInventoryService;
    const controller = new CommerceInventoryController(service);

    expect(() => controller.listInventory({ headers: {} }, {})).toThrow(UnauthorizedException);
  });
});
