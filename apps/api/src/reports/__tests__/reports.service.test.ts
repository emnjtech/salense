import { UnauthorizedException } from "@nestjs/common";
import type { PrismaService } from "../../database/prisma.service.js";
import { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";
import { ReportsService } from "../reports.service.js";

const business = { id: "business_1" } as const;

describe("ReportsService", () => {
  it("aggregates deterministic historical analytics for the authenticated business", async () => {
    const { prisma, service } = createService({
      customers: [
        {
          connectedStoreId: "store_1",
          email: "ada@example.com",
          firstName: "Ada",
          id: "customer_1",
          lastName: "Lovelace",
          platform: StorePlatform.Shopify,
          username: null,
        },
      ],
      orderItems: [
        {
          connectedStoreId: "store_1",
          name: "Brass Desk Lamp",
          platform: StorePlatform.Shopify,
          platformProductId: "shopify_lamp",
          quantity: 3,
          sku: "LAMP-1",
          totalAmount: "120.00",
          commerceOrderId: "order_1",
        },
      ],
      orders: [
        {
          connectedStoreId: "store_1",
          id: "order_1",
          orderedAt: new Date("2026-07-01T10:00:00.000Z"),
          platform: StorePlatform.Shopify,
          sourceMetadata: { raw: { billing: { email: "ada@example.com" } } },
          totalAmount: "120.00",
        },
        {
          connectedStoreId: "store_1",
          id: "order_2",
          orderedAt: new Date("2026-07-02T10:00:00.000Z"),
          platform: StorePlatform.AmazonSeller,
          sourceMetadata: { raw: { billing: { email: "guest@example.com" } } },
          totalAmount: "80.00",
        },
      ],
      products: [
        {
          connectedStoreId: "store_1",
          currentStockQuantity: 4,
          id: "product_1",
          name: "Brass Desk Lamp",
          platform: StorePlatform.Shopify,
          platformProductId: "shopify_lamp",
          priceAmount: "25.00",
          sku: "LAMP-1",
          stockStatus: "lowstock",
        },
      ],
      refunds: [{ id: "refund_1" }],
      stores: [{ id: "store_1", platform: StorePlatform.Shopify, storeName: "Shopify London" }],
    });

    const response = await service.getOverview("user_1", {
      dateFrom: "2026-07-01T00:00:00.000Z",
      dateTo: "2026-07-03T23:59:59.999Z",
    });

    expect(response).toMatchObject({
      inventory: {
        inventoryRisk: 1,
        inventoryValue: 100,
        lowStock: 1,
        outOfStock: 0,
      },
      kpis: {
        averageOrderValue: 100,
        businessHealthScore: 78,
        orders: 2,
        refunds: 1,
        revenue: 200,
      },
      ordersByPlatform: [
        { platform: StorePlatform.AmazonSeller, value: 1 },
        { platform: StorePlatform.Shopify, value: 1 },
      ],
      revenueByPlatform: [
        { platform: StorePlatform.Shopify, value: 120 },
        { platform: StorePlatform.AmazonSeller, value: 80 },
      ],
      stores: [{ id: "store_1", platform: StorePlatform.Shopify, storeName: "Shopify London" }],
      topCustomers: [
        {
          averageOrderValue: 120,
          customerId: "customer_1",
          customerName: "Ada Lovelace",
          lifetimeSpend: 120,
          orders: 1,
        },
        {
          averageOrderValue: 80,
          customerId: null,
          customerName: "guest@example.com",
          lifetimeSpend: 80,
          orders: 1,
        },
      ],
      topProducts: [
        {
          inventory: 4,
          platform: StorePlatform.Shopify,
          productId: "product_1",
          productName: "Brass Desk Lamp",
          revenue: 120,
          sku: "LAMP-1",
          unitsSold: 3,
        },
      ],
    });
    expect(response.revenueTrend).toEqual([
      {
        averageOrderValue: 120,
        bestPlatform: { platform: StorePlatform.Shopify, value: 120 },
        date: "2026-07-01",
        orders: 1,
        revenue: 120,
        topProduct: { productName: "Brass Desk Lamp", revenue: 120, unitsSold: 3 },
        value: 120,
      },
      {
        averageOrderValue: 80,
        bestPlatform: { platform: StorePlatform.AmazonSeller, value: 80 },
        date: "2026-07-02",
        orders: 1,
        revenue: 80,
        topProduct: null,
        value: 80,
      },
      {
        averageOrderValue: 0,
        bestPlatform: null,
        date: "2026-07-03",
        orders: 0,
        revenue: 0,
        topProduct: null,
        value: 0,
      },
    ]);
    expect(response.ordersTrend[0]).toMatchObject({
      date: "2026-07-01",
      orders: 1,
      revenue: 120,
      value: 1,
    });
    expect(prisma.commerceOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          businessId: business.id,
          orderedAt: {
            gte: new Date("2026-07-01T00:00:00.000Z"),
            lte: new Date("2026-07-03T23:59:59.999Z"),
          },
        }),
      }),
    );
  });

  it("applies platform and store filters to normalized reporting data", async () => {
    const { prisma, service } = createService();

    await service.getOverview("user_1", {
      platform: StorePlatform.TikTokShop,
      store: "store_2",
    });

    expect(prisma.commerceOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          businessId: business.id,
          connectedStoreId: "store_2",
          platform: StorePlatform.TikTokShop,
        }),
      }),
    );
  });

  it("does not expose credentials, token material, hashes, or raw payloads", async () => {
    const { service } = createService({
      orders: [
        {
          connectedStoreId: "store_1",
          id: "order_1",
          orderedAt: new Date("2026-07-01T10:00:00.000Z"),
          platform: StorePlatform.WooCommerce,
          sourceMetadata: { raw: { billing: { email: "safe@example.com" }, token: "hidden" } },
          totalAmount: "15.00",
        },
      ],
    });

    const response = await service.getOverview("user_1", {});
    const serialized = JSON.stringify(response).toLowerCase();

    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("token");
    expect(serialized).not.toContain("credential");
    expect(serialized).not.toContain("hash");
    expect(serialized).not.toContain("raw");
  });

  it("rejects users without a business profile", async () => {
    const { service } = createService({ businessRecord: null });

    await expect(service.getOverview("missing_user", {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

function createService(
  input: {
    readonly businessRecord?: { readonly id: string } | null;
    readonly customers?: readonly ReportsCustomerTestRecord[];
    readonly orderItems?: readonly ReportsOrderItemTestRecord[];
    readonly orders?: readonly ReportsOrderTestRecord[];
    readonly products?: readonly ReportsProductTestRecord[];
    readonly refunds?: readonly { readonly id: string }[];
    readonly stores?: readonly ReportsStoreTestRecord[];
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
    commerceOrderItem: { findMany: jest.fn().mockResolvedValue(input.orderItems ?? []) },
    commerceProduct: { findMany: jest.fn().mockResolvedValue(input.products ?? []) },
    commerceRefund: { findMany: jest.fn().mockResolvedValue(input.refunds ?? []) },
    connectedStore: { findMany: jest.fn().mockResolvedValue(input.stores ?? []) },
  };
  const prismaService = { client: prisma } as unknown as PrismaService;

  return { prisma, service: new ReportsService(prismaService) };
}

interface ReportsStoreTestRecord {
  readonly id: string;
  readonly platform: StorePlatform;
  readonly storeName: string;
}

interface ReportsOrderTestRecord {
  readonly connectedStoreId: string;
  readonly id: string;
  readonly orderedAt: Date | null;
  readonly platform: StorePlatform;
  readonly sourceMetadata: unknown;
  readonly totalAmount: unknown;
}

interface ReportsOrderItemTestRecord {
  readonly commerceOrderId: string;
  readonly connectedStoreId: string;
  readonly name: string | null;
  readonly platform: StorePlatform;
  readonly platformProductId: string | null;
  readonly quantity: number | null;
  readonly sku: string | null;
  readonly totalAmount: unknown;
}

interface ReportsProductTestRecord {
  readonly connectedStoreId: string;
  readonly currentStockQuantity: number | null;
  readonly id: string;
  readonly name: string | null;
  readonly platform: StorePlatform;
  readonly platformProductId: string;
  readonly priceAmount: unknown;
  readonly sku: string | null;
  readonly stockStatus: string | null;
}

interface ReportsCustomerTestRecord {
  readonly connectedStoreId: string;
  readonly email: string | null;
  readonly firstName: string | null;
  readonly id: string;
  readonly lastName: string | null;
  readonly platform: StorePlatform;
  readonly username: string | null;
}
