import { UnauthorizedException } from "@nestjs/common";
import type { PrismaService } from "../../database/prisma.service.js";
import { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";
import { CommerceCustomersService } from "../commerce-customers.service.js";

const business = { id: "business_1" } as const;

describe("CommerceCustomersService", () => {
  it("returns safe customer intelligence fields with purchase metrics", async () => {
    const { service } = createService({
      customers: [
        {
          connectedStoreId: "store_1",
          email: "ada@example.com",
          firstName: "Ada",
          id: "customer_db_1",
          lastName: "Lovelace",
          platform: StorePlatform.WooCommerce,
          platformCustomerId: "woo_cust_1",
          sourceMetadata: {
            raw: {
              billing: {
                city: "London",
                country: "GB",
              },
            },
          },
          username: "ada",
        },
      ],
      orders: [
        order("order_1", "store_1", StorePlatform.WooCommerce, "ada@example.com", "120.50"),
        order("order_2", "store_1", StorePlatform.WooCommerce, "ada@example.com", "79.50"),
      ],
    });

    await expect(service.listCustomers("user_1", {})).resolves.toEqual({
      customers: [
        {
          averageOrderValue: 100,
          city: "London",
          country: "GB",
          customerEmail: "ada@example.com",
          customerId: "customer_db_1",
          customerName: "Ada Lovelace",
          lastPurchaseDate: "2026-07-03T10:15:00.000Z",
          lifetimeSpend: 200,
          platform: StorePlatform.WooCommerce,
          totalOrders: 2,
        },
      ],
      summary: {
        highestLifetimeCustomer: {
          customerId: "customer_db_1",
          customerName: "Ada Lovelace",
          lifetimeSpend: 200,
        },
        newCustomers: 0,
        returningCustomers: 1,
      },
    });
  });

  it("applies platform filters within the user's business", async () => {
    const { prisma, service } = createService();

    await service.listCustomers("user_1", { platform: StorePlatform.AmazonSeller });

    expect(prisma.commerceCustomer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          businessId: business.id,
          platform: StorePlatform.AmazonSeller,
        },
      }),
    );
    expect(prisma.commerceOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          businessId: business.id,
          platform: StorePlatform.AmazonSeller,
        },
      }),
    );
  });

  it("filters by country and search without exposing source payloads", async () => {
    const { service } = createService({
      customers: [
        {
          connectedStoreId: "store_1",
          email: "buyer@example.com",
          firstName: "Buyer",
          id: "customer_db_1",
          lastName: "One",
          platform: StorePlatform.TikTokShop,
          platformCustomerId: "tt_1",
          sourceMetadata: {
            raw: {
              billing: { city: "Manchester", country: "GB" },
              secret: "must-not-leak",
              token: "hidden",
            },
          },
          username: null,
        },
        {
          connectedStoreId: "store_2",
          email: "other@example.com",
          firstName: "Other",
          id: "customer_db_2",
          lastName: "Customer",
          platform: StorePlatform.WooCommerce,
          platformCustomerId: "woo_2",
          sourceMetadata: { raw: { billing: { city: "Paris", country: "FR" } } },
          username: null,
        },
      ],
    });

    const response = await service.listCustomers("user_1", {
      country: "GB",
      search: "manchester",
    });
    const serialized = JSON.stringify(response).toLowerCase();

    expect(response.customers).toHaveLength(1);
    expect(response.customers[0]).toMatchObject({
      city: "Manchester",
      country: "GB",
      customerEmail: "buyer@example.com",
    });
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("token");
    expect(serialized).not.toContain("credential");
    expect(serialized).not.toContain("hash");
  });

  it("rejects users without a business profile", async () => {
    const { service } = createService({ businessRecord: null });

    await expect(service.listCustomers("missing_user", {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

function createService(
  input: {
    readonly businessRecord?: { readonly id: string } | null;
    readonly customers?: readonly CommerceCustomerTestRecord[];
    readonly orders?: readonly CommerceOrderTestRecord[];
  } = {},
) {
  const prisma = {
    business: {
      findUnique: jest
        .fn()
        .mockResolvedValue(input.businessRecord === undefined ? business : input.businessRecord),
    },
    commerceCustomer: { findMany: jest.fn().mockResolvedValue(input.customers ?? []) },
    commerceOrder: { findMany: jest.fn().mockResolvedValue(input.orders ?? []) },
  };
  const prismaService = { client: prisma } as unknown as PrismaService;

  return { prisma, service: new CommerceCustomersService(prismaService) };
}

function order(
  id: string,
  connectedStoreId: string,
  platform: StorePlatform,
  email: string,
  totalAmount: string,
): CommerceOrderTestRecord {
  return {
    connectedStoreId,
    id,
    orderedAt: new Date(id === "order_1" ? "2026-07-02T09:00:00.000Z" : "2026-07-03T10:15:00.000Z"),
    platform,
    sourceMetadata: { raw: { billing: { email } } },
    totalAmount,
  };
}

interface CommerceCustomerTestRecord {
  readonly connectedStoreId: string;
  readonly email: string | null;
  readonly firstName: string | null;
  readonly id: string;
  readonly lastName: string | null;
  readonly platform: StorePlatform;
  readonly platformCustomerId: string;
  readonly sourceMetadata: unknown;
  readonly username: string | null;
}

interface CommerceOrderTestRecord {
  readonly connectedStoreId: string;
  readonly id: string;
  readonly orderedAt: Date | null;
  readonly platform: StorePlatform;
  readonly sourceMetadata: unknown;
  readonly totalAmount: unknown;
}
