import { UnauthorizedException } from "@nestjs/common";
import { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";
import { CommerceOrdersController } from "../commerce-orders.controller.js";
import type { CommerceOrdersService } from "../commerce-orders.service.js";

describe("CommerceOrdersController", () => {
  it("passes authenticated requests and filters to the service", async () => {
    const service = {
      listOrders: jest.fn().mockResolvedValue({ orders: [] }),
    } as unknown as jest.Mocked<CommerceOrdersService>;
    const controller = new CommerceOrdersController(service);
    const query = { platform: StorePlatform.WooCommerce, status: "processing" };

    await expect(
      controller.listOrders(
        { headers: {}, user: { email: "owner@example.com", emailVerified: true, sub: "user_1" } },
        query,
      ),
    ).resolves.toEqual({ orders: [] });

    expect(service.listOrders).toHaveBeenCalledWith("user_1", query);
  });

  it("rejects when authenticated context is missing", async () => {
    const service = { listOrders: jest.fn() } as unknown as CommerceOrdersService;
    const controller = new CommerceOrdersController(service);

    expect(() => controller.listOrders({ headers: {} }, {})).toThrow(UnauthorizedException);
  });
});
