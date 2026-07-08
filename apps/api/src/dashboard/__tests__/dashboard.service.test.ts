import { UnauthorizedException } from "@nestjs/common";
import type { PrismaService } from "../../database/prisma.service.js";
import { StoreConnectionStatus } from "../../store-integrations/types/store-connection-status.enum.js";
import { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";
import { DashboardService } from "../dashboard.service.js";

const business = { id: "business_1", name: "Harbour Home Co" } as const;

describe("DashboardService", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-07-03T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns an empty dashboard state", async () => {
    const { service } = createService();

    await expect(service.getTodayDashboard("user_1")).resolves.toEqual({
      activeStores: 0,
      averageOrderValueToday: 0,
      basicBusinessHealthScore: null,
      basicRuleBasedInsights: [
        {
          message: "Connect at least one store to begin unified commerce analysis.",
          severity: "WARNING",
          type: "CONNECTION",
        },
      ],
      bestPlatformToday: null,
      businessName: "Harbour Home Co",
      connectedPlatforms: [],
      hasCommerceData: false,
      lowStockCount: 0,
      ordersByPlatform: [],
      ordersToday: 0,
      productsSoldToday: 0,
      refundCountToday: 0,
      revenueByPlatform: [],
      revenueChangePercent: null,
      todayRevenue: 0,
      topProductToday: null,
      yesterdayRevenue: 0,
    });
  });

  it("aggregates single-platform WooCommerce data", async () => {
    const { service } = createService({
      activeStores: [{ id: "store_1", platform: StorePlatform.WooCommerce }],
      products: [{ currentStockQuantity: 3, stockStatus: "instock" }],
      todayItems: [
        {
          name: "Trail Shoe",
          platform: StorePlatform.WooCommerce,
          quantity: 2,
          sku: "shoe-1",
          totalAmount: "80.00",
        },
      ],
      todayOrders: [
        { id: "order_1", platform: StorePlatform.WooCommerce, totalAmount: "120.50" },
        { id: "order_2", platform: StorePlatform.WooCommerce, totalAmount: "79.50" },
      ],
      todayRefunds: [{ id: "refund_1" }],
      yesterdayOrders: [
        { id: "order_yesterday", platform: StorePlatform.WooCommerce, totalAmount: "100" },
      ],
    });

    const dashboard = await service.getTodayDashboard("user_1");

    expect(dashboard).toMatchObject({
      activeStores: 1,
      averageOrderValueToday: 100,
      bestPlatformToday: StorePlatform.WooCommerce,
      connectedPlatforms: [StorePlatform.WooCommerce],
      lowStockCount: 1,
      ordersToday: 2,
      productsSoldToday: 2,
      refundCountToday: 1,
      revenueChangePercent: 100,
      todayRevenue: 200,
      yesterdayRevenue: 100,
    });
    expect(dashboard.revenueByPlatform).toEqual([
      { platform: StorePlatform.WooCommerce, value: 200 },
    ]);
    expect(dashboard.ordersByPlatform).toEqual([{ platform: StorePlatform.WooCommerce, value: 2 }]);
    expect(dashboard.topProductToday).toEqual({
      name: "Trail Shoe",
      platform: StorePlatform.WooCommerce,
      quantitySold: 2,
      revenue: 80,
      sku: "shoe-1",
    });
  });

  it("aggregates multi-platform commerce data", async () => {
    const { service } = createService({
      activeStores: [
        { id: "woo", platform: StorePlatform.WooCommerce },
        { id: "amazon", platform: StorePlatform.AmazonSeller },
        { id: "tiktok", platform: StorePlatform.TikTokShop },
      ],
      todayItems: [
        {
          name: "Wax",
          platform: StorePlatform.TikTokShop,
          quantity: 4,
          sku: "wax",
          totalAmount: 100,
        },
        {
          name: "Wax",
          platform: StorePlatform.AmazonSeller,
          quantity: 1,
          sku: "wax-a",
          totalAmount: 45,
        },
      ],
      todayOrders: [
        { id: "woo_1", platform: StorePlatform.WooCommerce, totalAmount: 75 },
        { id: "amazon_1", platform: StorePlatform.AmazonSeller, totalAmount: 180 },
        { id: "amazon_2", platform: StorePlatform.AmazonSeller, totalAmount: 120 },
        { id: "tiktok_1", platform: StorePlatform.TikTokShop, totalAmount: 90 },
      ],
      yesterdayOrders: [{ id: "y_1", platform: StorePlatform.WooCommerce, totalAmount: 300 }],
    });

    const dashboard = await service.getTodayDashboard("user_1");

    expect(dashboard.todayRevenue).toBe(465);
    expect(dashboard.ordersToday).toBe(4);
    expect(dashboard.connectedPlatforms).toEqual([
      StorePlatform.AmazonSeller,
      StorePlatform.TikTokShop,
      StorePlatform.WooCommerce,
    ]);
    expect(dashboard.bestPlatformToday).toBe(StorePlatform.AmazonSeller);
    expect(dashboard.revenueByPlatform).toEqual([
      { platform: StorePlatform.AmazonSeller, value: 300 },
      { platform: StorePlatform.TikTokShop, value: 90 },
      { platform: StorePlatform.WooCommerce, value: 75 },
    ]);
    expect(dashboard.ordersByPlatform).toEqual([
      { platform: StorePlatform.AmazonSeller, value: 2 },
      { platform: StorePlatform.TikTokShop, value: 1 },
      { platform: StorePlatform.WooCommerce, value: 1 },
    ]);
  });

  it("excludes failed and pending orders from revenue while keeping order counts visible", async () => {
    const { service } = createService({
      activeStores: [{ id: "store_1", platform: StorePlatform.WooCommerce }],
      todayOrders: [
        {
          id: "completed",
          orderStatus: "completed",
          platform: StorePlatform.WooCommerce,
          totalAmount: 100,
        },
        {
          id: "failed",
          orderStatus: "failed",
          platform: StorePlatform.WooCommerce,
          totalAmount: 80,
        },
        {
          id: "pending",
          orderStatus: "pending",
          platform: StorePlatform.WooCommerce,
          totalAmount: 50,
        },
      ],
    });

    const dashboard = await service.getTodayDashboard("user_1");

    expect(dashboard.ordersToday).toBe(3);
    expect(dashboard.todayRevenue).toBe(100);
    expect(dashboard.averageOrderValueToday).toBe(100);
    expect(dashboard.revenueByPlatform).toEqual([
      { platform: StorePlatform.WooCommerce, value: 100 },
    ]);
  });

  it("calculates negative revenue change and business health score", async () => {
    const { service } = createService({
      activeStores: [{ id: "store_1", platform: StorePlatform.WooCommerce }],
      products: [
        { currentStockQuantity: 0, stockStatus: "outofstock" },
        { currentStockQuantity: 2, stockStatus: "instock" },
      ],
      todayOrders: [{ id: "today", platform: StorePlatform.WooCommerce, totalAmount: 80 }],
      yesterdayOrders: [{ id: "yesterday", platform: StorePlatform.WooCommerce, totalAmount: 100 }],
    });

    const dashboard = await service.getTodayDashboard("user_1");

    expect(dashboard.revenueChangePercent).toBe(-20);
    expect(dashboard.basicBusinessHealthScore).toBe(55);
  });

  it("generates rule-based insights", async () => {
    const { service } = createService({
      activeStores: [{ id: "amazon", platform: StorePlatform.AmazonSeller }],
      products: [{ currentStockQuantity: 1, stockStatus: "instock" }],
      todayItems: [
        {
          name: "Premium Wax",
          platform: StorePlatform.AmazonSeller,
          quantity: 3,
          sku: null,
          totalAmount: 90,
        },
      ],
      todayOrders: [{ id: "today", platform: StorePlatform.AmazonSeller, totalAmount: 120 }],
      yesterdayOrders: [
        { id: "yesterday", platform: StorePlatform.AmazonSeller, totalAmount: 100 },
      ],
    });

    const dashboard = await service.getTodayDashboard("user_1");

    expect(dashboard.basicRuleBasedInsights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "Amazon Seller is today's strongest revenue channel." }),
        expect.objectContaining({ message: "Revenue is up 20% compared with yesterday." }),
        expect.objectContaining({ message: "Premium Wax is today's top product by units sold." }),
        expect.objectContaining({ message: "1 product need inventory attention." }),
      ]),
    );
  });

  it("scopes all commerce queries to the authenticated user's business", async () => {
    const { service, prisma } = createService();

    await service.getTodayDashboard("user_1");

    expect(prisma.business.findUnique).toHaveBeenCalledWith({
      where: { ownerId: "user_1" },
      select: { id: true, name: true },
    });
    expect(prisma.commerceOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          businessId: business.id,
          connectedStore: {
            connectionStatus: StoreConnectionStatus.Connected,
            disconnectedAt: null,
          },
        }),
      }),
    );
    expect(prisma.commerceOrderItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          businessId: business.id,
          connectedStore: {
            connectionStatus: StoreConnectionStatus.Connected,
            disconnectedAt: null,
          },
        }),
      }),
    );
    expect(prisma.commerceRefund.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          businessId: business.id,
          connectedStore: {
            connectionStatus: StoreConnectionStatus.Connected,
            disconnectedAt: null,
          },
        }),
      }),
    );
    expect(prisma.commerceProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          businessId: business.id,
          connectedStore: {
            connectionStatus: StoreConnectionStatus.Connected,
            disconnectedAt: null,
          },
        },
      }),
    );
  });

  it("rejects users without a business profile", async () => {
    const { service } = createService({ businessRecord: null });

    await expect(service.getTodayDashboard("user_without_business")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("does not expose credentials or secret material", async () => {
    const { service } = createService({
      activeStores: [{ id: "store_1", platform: StorePlatform.WooCommerce }],
      todayOrders: [{ id: "order_1", platform: StorePlatform.WooCommerce, totalAmount: 10 }],
    });

    const dashboard = await service.getTodayDashboard("user_1");
    const serialized = JSON.stringify(dashboard).toLowerCase();

    expect(serialized).not.toContain("credential");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("token");
    expect(serialized).not.toContain("hash");
  });
});

function createService(
  input: {
    readonly activeStores?: readonly { readonly id: string; readonly platform: StorePlatform }[];
    readonly businessRecord?: { readonly id: string } | null;
    readonly products?: readonly {
      readonly currentStockQuantity: number | null;
      readonly stockStatus: string | null;
    }[];
    readonly todayItems?: readonly {
      readonly name: string | null;
      readonly order?: { readonly orderStatus: string | null };
      readonly platform: StorePlatform;
      readonly quantity: number | null;
      readonly sku: string | null;
      readonly totalAmount: unknown;
    }[];
    readonly todayOrders?: readonly {
      readonly id: string;
      readonly orderStatus?: string | null;
      readonly platform: StorePlatform;
      readonly totalAmount: unknown;
    }[];
    readonly todayRefunds?: readonly { readonly id: string }[];
    readonly yesterdayOrders?: readonly {
      readonly id: string;
      readonly orderStatus?: string | null;
      readonly platform: StorePlatform;
      readonly totalAmount: unknown;
    }[];
  } = {},
) {
  const prisma = {
    business: {
      findUnique: jest
        .fn()
        .mockResolvedValue(input.businessRecord === undefined ? business : input.businessRecord),
    },
    commerceOrder: {
      findMany: jest
        .fn()
        .mockResolvedValueOnce((input.todayOrders ?? []).map(withRevenueEligibleStatus))
        .mockResolvedValueOnce((input.yesterdayOrders ?? []).map(withRevenueEligibleStatus)),
    },
    commerceOrderItem: {
      findMany: jest.fn().mockResolvedValue(
        (input.todayItems ?? []).map((item) => ({
          order: { orderStatus: "processing" },
          ...item,
        })),
      ),
    },
    commerceProduct: { findMany: jest.fn().mockResolvedValue(input.products ?? []) },
    commerceRefund: { findMany: jest.fn().mockResolvedValue(input.todayRefunds ?? []) },
    connectedStore: { findMany: jest.fn().mockResolvedValue(input.activeStores ?? []) },
  };
  const prismaService = { client: prisma } as unknown as PrismaService;

  return { prisma, service: new DashboardService(prismaService) };
}

function withRevenueEligibleStatus<T extends { readonly orderStatus?: string | null }>(
  order: T,
): T & { readonly orderStatus: string | null } {
  return { orderStatus: "processing", ...order };
}
