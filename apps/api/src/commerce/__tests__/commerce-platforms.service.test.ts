import { UnauthorizedException } from "@nestjs/common";
import type { PrismaService } from "../../database/prisma.service.js";
import { StoreConnectionStatus } from "../../store-integrations/types/store-connection-status.enum.js";
import { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";
import { CommercePlatformsService } from "../commerce-platforms.service.js";

const business = { id: "business_1" } as const;

describe("CommercePlatformsService", () => {
  it("returns platform-only performance from normalized commerce data", async () => {
    const { prisma, service } = createService({
      orderItems: [
        {
          name: "Brass Desk Lamp",
          platformProductId: "shopify_lamp",
          quantity: 2,
          sku: "LAMP-1",
          totalAmount: "90.00",
        },
        {
          name: "Brass Desk Lamp",
          platformProductId: "shopify_lamp",
          quantity: 1,
          sku: "LAMP-1",
          totalAmount: "45.00",
        },
      ],
      orders: [
        {
          connectedStore: { storeName: "Shopify London" },
          currency: "GBP",
          id: "order_db_1",
          orderStatus: "paid",
          orderedAt: new Date("2026-07-05T09:30:00.000Z"),
          platformOrderId: "1001",
          platformOrderNumber: "#1001",
          totalAmount: "135.00",
        },
        {
          connectedStore: { storeName: "Shopify London" },
          currency: "GBP",
          id: "order_db_2",
          orderStatus: "paid",
          orderedAt: new Date("2026-07-05T08:00:00.000Z"),
          platformOrderId: "1000",
          platformOrderNumber: null,
          totalAmount: "65.00",
        },
      ],
      products: [
        {
          connectedStore: { storeName: "Shopify London" },
          currentStockQuantity: 3,
          id: "product_db_1",
          name: "Brass Desk Lamp",
          sku: "LAMP-1",
          stockStatus: "lowstock",
        },
      ],
      refunds: [{ id: "refund_1" }],
      stores: [
        {
          connectionStatus: StoreConnectionStatus.Connected,
          id: "store_1",
          lastSynchronisedAt: new Date("2026-07-05T10:00:00.000Z"),
          region: "GB",
          storeName: "Shopify London",
          storeUrl: "https://northstar.example",
        },
      ],
      syncCursors: [
        {
          lastAttemptedSyncedAt: new Date("2026-07-05T10:00:00.000Z"),
          lastSuccessfulSyncedAt: new Date("2026-07-05T10:00:00.000Z"),
          resource: "ORDERS",
          status: "SUCCESS",
        },
      ],
    });

    await expect(service.getPlatformSummary("user_1", StorePlatform.Shopify)).resolves.toEqual({
      connectedStores: [
        {
          connectionStatus: StoreConnectionStatus.Connected,
          id: "store_1",
          lastSynchronisedAt: "2026-07-05T10:00:00.000Z",
          region: "GB",
          storeName: "Shopify London",
          storeUrl: "https://northstar.example",
        },
      ],
      inventoryAlerts: [
        {
          currentStock: 3,
          productId: "product_db_1",
          productName: "Brass Desk Lamp",
          sku: "LAMP-1",
          stockStatus: "lowstock",
          storeName: "Shopify London",
        },
      ],
      metrics: {
        averageOrderValue: 100,
        lowStockCount: 1,
        orders: 2,
        productsSold: 3,
        refunds: 1,
        revenue: 200,
      },
      platform: StorePlatform.Shopify,
      platformName: "Shopify",
      recentOrders: [
        {
          currency: "GBP",
          orderDate: "2026-07-05T09:30:00.000Z",
          orderId: "order_db_1",
          orderNumber: "#1001",
          revenueEligible: true,
          status: "paid",
          storeName: "Shopify London",
          totalValue: 135,
        },
        {
          currency: "GBP",
          orderDate: "2026-07-05T08:00:00.000Z",
          orderId: "order_db_2",
          orderNumber: "1000",
          revenueEligible: true,
          status: "paid",
          storeName: "Shopify London",
          totalValue: 65,
        },
      ],
      syncStatus: [
        {
          lastAttemptedSyncedAt: "2026-07-05T10:00:00.000Z",
          lastSuccessfulSyncedAt: "2026-07-05T10:00:00.000Z",
          resource: "ORDERS",
          status: "SUCCESS",
        },
      ],
      topProducts: [
        {
          name: "Brass Desk Lamp",
          platformProductId: "shopify_lamp",
          quantitySold: 3,
          revenue: 135,
          sku: "LAMP-1",
        },
      ],
    });

    expect(prisma.commerceOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          businessId: business.id,
          connectedStore: {
            connectionStatus: StoreConnectionStatus.Connected,
            disconnectedAt: null,
          },
          platform: StorePlatform.Shopify,
        },
      }),
    );
    expect(prisma.connectedStore.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.not.objectContaining({
          accessTokenHash: true,
          refreshTokenHash: true,
        }),
      }),
    );
  });

  it("does not expose credentials, token material, hashes, or raw marketplace payloads", async () => {
    const { service } = createService({
      orders: [
        {
          connectedStore: { storeName: "Safe Store" },
          currency: "GBP",
          id: "order_db_1",
          orderStatus: "paid",
          orderedAt: null,
          platformOrderId: "safe_order",
          platformOrderNumber: null,
          totalAmount: "10.00",
        },
      ],
      stores: [
        {
          connectionStatus: StoreConnectionStatus.Connected,
          id: "store_1",
          lastSynchronisedAt: null,
          region: null,
          storeName: "Safe Store",
          storeUrl: null,
        },
      ],
    });

    const response = await service.getPlatformSummary("user_1", StorePlatform.AmazonSeller);
    const serialized = JSON.stringify(response).toLowerCase();

    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("token");
    expect(serialized).not.toContain("credential");
    expect(serialized).not.toContain("hash");
    expect(serialized).not.toContain("raw");
  });

  it("rejects users without a business profile", async () => {
    const { service } = createService({ businessRecord: null });

    await expect(
      service.getPlatformSummary("missing_user", StorePlatform.WooCommerce),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

function createService(
  input: {
    readonly businessRecord?: { readonly id: string } | null;
    readonly orderItems?: readonly CommerceOrderItemTestRecord[];
    readonly orders?: readonly CommerceOrderTestRecord[];
    readonly products?: readonly CommerceProductTestRecord[];
    readonly refunds?: readonly { readonly id: string }[];
    readonly stores?: readonly ConnectedStoreTestRecord[];
    readonly syncCursors?: readonly CommerceSyncCursorTestRecord[];
  } = {},
) {
  const prisma = {
    business: {
      findUnique: jest
        .fn()
        .mockResolvedValue(input.businessRecord === undefined ? business : input.businessRecord),
    },
    commerceOrder: { findMany: jest.fn().mockResolvedValue(input.orders ?? []) },
    commerceOrderItem: {
      findMany: jest.fn().mockResolvedValue(
        (input.orderItems ?? []).map((item) => ({
          order: { orderStatus: "paid" },
          ...item,
        })),
      ),
    },
    commerceProduct: { findMany: jest.fn().mockResolvedValue(input.products ?? []) },
    commerceRefund: { findMany: jest.fn().mockResolvedValue(input.refunds ?? []) },
    commerceSyncCursor: { findMany: jest.fn().mockResolvedValue(input.syncCursors ?? []) },
    connectedStore: { findMany: jest.fn().mockResolvedValue(input.stores ?? []) },
  };
  const prismaService = { client: prisma } as unknown as PrismaService;

  return { prisma, service: new CommercePlatformsService(prismaService) };
}

interface ConnectedStoreTestRecord {
  readonly connectionStatus: StoreConnectionStatus;
  readonly id: string;
  readonly lastSynchronisedAt: Date | null;
  readonly region: string | null;
  readonly storeName: string;
  readonly storeUrl: string | null;
}

interface CommerceOrderTestRecord {
  readonly connectedStore: { readonly storeName: string };
  readonly currency: string | null;
  readonly id: string;
  readonly orderStatus: string | null;
  readonly orderedAt: Date | null;
  readonly platformOrderId: string;
  readonly platformOrderNumber: string | null;
  readonly totalAmount: unknown;
}

interface CommerceOrderItemTestRecord {
  readonly name: string | null;
  readonly order?: { readonly orderStatus: string | null };
  readonly platformProductId: string | null;
  readonly quantity: number | null;
  readonly sku: string | null;
  readonly totalAmount: unknown;
}

interface CommerceProductTestRecord {
  readonly connectedStore: { readonly storeName: string };
  readonly currentStockQuantity: number | null;
  readonly id: string;
  readonly name: string | null;
  readonly sku: string | null;
  readonly stockStatus: string | null;
}

interface CommerceSyncCursorTestRecord {
  readonly lastAttemptedSyncedAt: Date | null;
  readonly lastSuccessfulSyncedAt: Date | null;
  readonly resource: string;
  readonly status: string;
}
