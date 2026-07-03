import { UnauthorizedException } from "@nestjs/common";
import { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";
import { CommerceProductsController } from "../commerce-products.controller.js";
import type { CommerceProductsService } from "../commerce-products.service.js";

describe("CommerceProductsController", () => {
  it("passes authenticated requests and filters to the service", async () => {
    const service = {
      listProducts: jest.fn().mockResolvedValue({ products: [] }),
    } as unknown as jest.Mocked<CommerceProductsService>;
    const controller = new CommerceProductsController(service);
    const query = { platform: StorePlatform.WooCommerce, search: "shoe", stockStatus: "instock" };

    await expect(
      controller.listProducts(
        { headers: {}, user: { email: "owner@example.com", emailVerified: true, sub: "user_1" } },
        query,
      ),
    ).resolves.toEqual({ products: [] });

    expect(service.listProducts).toHaveBeenCalledWith("user_1", query);
  });

  it("rejects when authenticated context is missing", () => {
    const service = { listProducts: jest.fn() } as unknown as CommerceProductsService;
    const controller = new CommerceProductsController(service);

    expect(() => controller.listProducts({ headers: {} }, {})).toThrow(UnauthorizedException);
  });
});
