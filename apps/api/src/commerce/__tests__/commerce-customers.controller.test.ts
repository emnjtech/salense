import { UnauthorizedException } from "@nestjs/common";
import { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";
import { CommerceCustomersController } from "../commerce-customers.controller.js";
import type { CommerceCustomersService } from "../commerce-customers.service.js";

describe("CommerceCustomersController", () => {
  it("passes authenticated requests and filters to the service", async () => {
    const service = {
      listCustomers: jest.fn().mockResolvedValue({
        customers: [],
        summary: { highestLifetimeCustomer: null, newCustomers: 0, returningCustomers: 0 },
      }),
    } as unknown as jest.Mocked<CommerceCustomersService>;
    const controller = new CommerceCustomersController(service);
    const query = { country: "GB", platform: StorePlatform.WooCommerce, search: "ada" };

    await expect(
      controller.listCustomers(
        { headers: {}, user: { email: "owner@example.com", emailVerified: true, sub: "user_1" } },
        query,
      ),
    ).resolves.toEqual({
      customers: [],
      summary: { highestLifetimeCustomer: null, newCustomers: 0, returningCustomers: 0 },
    });

    expect(service.listCustomers).toHaveBeenCalledWith("user_1", query);
  });

  it("rejects when authenticated context is missing", () => {
    const service = { listCustomers: jest.fn() } as unknown as CommerceCustomersService;
    const controller = new CommerceCustomersController(service);

    expect(() => controller.listCustomers({ headers: {} }, {})).toThrow(UnauthorizedException);
  });
});
