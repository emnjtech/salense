import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { StoreConnectionStatus } from "../store-integrations/types/store-connection-status.enum.js";
import { StorePlatform } from "../store-integrations/types/store-platform.enum.js";
import { isRevenueEligibleOrderStatus } from "./order-revenue.js";
import type {
  CommercePlatformInventoryAlert,
  CommercePlatformRecentOrder,
  CommercePlatformSummaryResponse,
  CommercePlatformSyncStatus,
  CommercePlatformTopProduct,
} from "./types/commerce-platform-summary-response.type.js";

interface CommercePlatformsPrismaClient {
  readonly business: {
    findUnique(args: {
      readonly where: { readonly ownerId: string };
      readonly select: { readonly id: true };
    }): Promise<{ readonly id: string } | null>;
  };
  readonly connectedStore: {
    findMany(args: {
      readonly where: {
        readonly businessId: string;
        readonly connectionStatus: StoreConnectionStatus.Connected;
        readonly disconnectedAt: null;
        readonly platform: StorePlatform;
      };
      readonly orderBy: { readonly storeName: "asc" };
      readonly select: {
        readonly id: true;
        readonly connectionStatus: true;
        readonly lastSynchronisedAt: true;
        readonly region: true;
        readonly storeName: true;
        readonly storeUrl: true;
      };
    }): Promise<readonly ConnectedStoreRecord[]>;
  };
  readonly commerceOrder: {
    findMany(args: {
      readonly where: {
        readonly businessId: string;
        readonly connectedStore: ActiveConnectedStoreWhereInput;
        readonly platform: StorePlatform;
      };
      readonly orderBy: { readonly orderedAt: "desc" };
      readonly take?: number;
      readonly select: CommerceOrderSelect;
    }): Promise<readonly CommerceOrderRecord[]>;
  };
  readonly commerceOrderItem: {
    findMany(args: {
      readonly where: {
        readonly businessId: string;
        readonly connectedStore: ActiveConnectedStoreWhereInput;
        readonly platform: StorePlatform;
      };
      readonly select: CommerceOrderItemSelect;
    }): Promise<readonly CommerceOrderItemRecord[]>;
  };
  readonly commerceRefund: {
    findMany(args: {
      readonly where: {
        readonly businessId: string;
        readonly connectedStore: ActiveConnectedStoreWhereInput;
        readonly platform: StorePlatform;
      };
      readonly select: { readonly id: true };
    }): Promise<readonly { readonly id: string }[]>;
  };
  readonly commerceProduct: {
    findMany(args: {
      readonly where: {
        readonly businessId: string;
        readonly connectedStore: ActiveConnectedStoreWhereInput;
        readonly platform: StorePlatform;
      };
      readonly orderBy: { readonly name: "asc" };
      readonly select: CommerceProductSelect;
    }): Promise<readonly CommerceProductRecord[]>;
  };
  readonly commerceSyncCursor: {
    findMany(args: {
      readonly where: {
        readonly businessId: string;
        readonly connectedStore: ActiveConnectedStoreWhereInput;
        readonly platform: StorePlatform;
      };
      readonly orderBy: { readonly resource: "asc" };
      readonly select: CommerceSyncCursorSelect;
    }): Promise<readonly CommerceSyncCursorRecord[]>;
  };
}

interface ConnectedStoreRecord {
  readonly id: string;
  readonly connectionStatus: StoreConnectionStatus;
  readonly lastSynchronisedAt: Date | null;
  readonly region: string | null;
  readonly storeName: string;
  readonly storeUrl: string | null;
}

interface ActiveConnectedStoreWhereInput {
  readonly connectionStatus: StoreConnectionStatus.Connected;
  readonly disconnectedAt: null;
}

interface CommerceOrderSelect {
  readonly id: true;
  readonly platformOrderId: true;
  readonly platformOrderNumber: true;
  readonly orderStatus: true;
  readonly currency: true;
  readonly totalAmount: true;
  readonly orderedAt: true;
  readonly connectedStore: { readonly select: { readonly storeName: true } };
}

interface CommerceOrderRecord {
  readonly id: string;
  readonly platformOrderId: string;
  readonly platformOrderNumber: string | null;
  readonly orderStatus: string | null;
  readonly currency: string | null;
  readonly totalAmount: unknown;
  readonly orderedAt: Date | null;
  readonly connectedStore: { readonly storeName: string };
}

interface CommerceOrderItemSelect {
  readonly name: true;
  readonly order?: { readonly select: { readonly orderStatus: true } };
  readonly platformProductId: true;
  readonly quantity: true;
  readonly sku: true;
  readonly totalAmount: true;
}

interface CommerceOrderItemRecord {
  readonly name: string | null;
  readonly order?: { readonly orderStatus: string | null };
  readonly platformProductId: string | null;
  readonly quantity: number | null;
  readonly sku: string | null;
  readonly totalAmount: unknown;
}

interface CommerceProductSelect {
  readonly id: true;
  readonly connectedStore: { readonly select: { readonly storeName: true } };
  readonly currentStockQuantity: true;
  readonly name: true;
  readonly sku: true;
  readonly stockStatus: true;
}

interface CommerceProductRecord {
  readonly id: string;
  readonly connectedStore: { readonly storeName: string };
  readonly currentStockQuantity: number | null;
  readonly name: string | null;
  readonly sku: string | null;
  readonly stockStatus: string | null;
}

interface CommerceSyncCursorSelect {
  readonly lastAttemptedSyncedAt: true;
  readonly lastSuccessfulSyncedAt: true;
  readonly resource: true;
  readonly status: true;
}

interface CommerceSyncCursorRecord {
  readonly lastAttemptedSyncedAt: Date | null;
  readonly lastSuccessfulSyncedAt: Date | null;
  readonly resource: string;
  readonly status: string;
}

const orderSelect = {
  id: true,
  platformOrderId: true,
  platformOrderNumber: true,
  orderStatus: true,
  currency: true,
  totalAmount: true,
  orderedAt: true,
  connectedStore: { select: { storeName: true } },
} as const;

const orderItemSelect = {
  name: true,
  order: { select: { orderStatus: true } },
  platformProductId: true,
  quantity: true,
  sku: true,
  totalAmount: true,
} as const;

const productSelect = {
  id: true,
  connectedStore: { select: { storeName: true } },
  currentStockQuantity: true,
  name: true,
  sku: true,
  stockStatus: true,
} as const;

const syncCursorSelect = {
  lastAttemptedSyncedAt: true,
  lastSuccessfulSyncedAt: true,
  resource: true,
  status: true,
} as const;

const lowStockThreshold = 5;

@Injectable()
export class CommercePlatformsService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async getPlatformSummary(
    userId: string,
    platform: StorePlatform,
  ): Promise<CommercePlatformSummaryResponse> {
    const prisma = this.prismaService.client as unknown as CommercePlatformsPrismaClient;
    const business = await prisma.business.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!business) {
      throw new UnauthorizedException(
        "Company profile is required before viewing platform performance.",
      );
    }

    const [stores, orders, orderItems, refunds, products, syncCursors] = await Promise.all([
      prisma.connectedStore.findMany({
        where: {
          businessId: business.id,
          connectionStatus: StoreConnectionStatus.Connected,
          disconnectedAt: null,
          platform,
        },
        orderBy: { storeName: "asc" },
        select: {
          id: true,
          connectionStatus: true,
          lastSynchronisedAt: true,
          region: true,
          storeName: true,
          storeUrl: true,
        },
      }),
      prisma.commerceOrder.findMany({
        where: {
          businessId: business.id,
          connectedStore: activeConnectedStoreWhere(),
          platform,
        },
        orderBy: { orderedAt: "desc" },
        select: orderSelect,
      }),
      prisma.commerceOrderItem.findMany({
        where: {
          businessId: business.id,
          connectedStore: activeConnectedStoreWhere(),
          platform,
        },
        select: orderItemSelect,
      }),
      prisma.commerceRefund.findMany({
        where: {
          businessId: business.id,
          connectedStore: activeConnectedStoreWhere(),
          platform,
        },
        select: { id: true },
      }),
      prisma.commerceProduct.findMany({
        where: {
          businessId: business.id,
          connectedStore: activeConnectedStoreWhere(),
          platform,
        },
        orderBy: { name: "asc" },
        select: productSelect,
      }),
      prisma.commerceSyncCursor.findMany({
        where: {
          businessId: business.id,
          connectedStore: activeConnectedStoreWhere(),
          platform,
        },
        orderBy: { resource: "asc" },
        select: syncCursorSelect,
      }),
    ]);
    const revenue = sumOrders(orders);

    return {
      connectedStores: stores.map((store) => ({
        ...store,
        lastSynchronisedAt: store.lastSynchronisedAt?.toISOString() ?? null,
      })),
      inventoryAlerts: products.filter(isLowStockProduct).slice(0, 8).map(toInventoryAlert),
      metrics: {
        averageOrderValue: roundMetric(
          countRevenueEligibleOrders(orders) > 0 ? revenue / countRevenueEligibleOrders(orders) : 0,
        ),
        lowStockCount: products.filter(isLowStockProduct).length,
        orders: orders.length,
        productsSold: orderItems.reduce(
          (total, item) =>
            total +
            (isRevenueEligibleOrderStatus(item.order?.orderStatus)
              ? Math.max(item.quantity ?? 0, 0)
              : 0),
          0,
        ),
        refunds: refunds.length,
        revenue,
      },
      platform,
      platformName: formatPlatform(platform),
      recentOrders: orders.slice(0, 8).map(toRecentOrder),
      syncStatus: syncCursors.map(toSyncStatus),
      topProducts: toTopProducts(orderItems),
    };
  }
}

function activeConnectedStoreWhere(): ActiveConnectedStoreWhereInput {
  return {
    connectionStatus: StoreConnectionStatus.Connected,
    disconnectedAt: null,
  };
}

function toRecentOrder(order: CommerceOrderRecord): CommercePlatformRecentOrder {
  return {
    currency: order.currency,
    orderDate: order.orderedAt?.toISOString() ?? null,
    orderId: order.id,
    orderNumber: order.platformOrderNumber ?? order.platformOrderId,
    revenueEligible: isRevenueEligibleOrderStatus(order.orderStatus),
    status: order.orderStatus,
    storeName: order.connectedStore.storeName,
    totalValue: toNumberOrNull(order.totalAmount),
  };
}

function toInventoryAlert(product: CommerceProductRecord): CommercePlatformInventoryAlert {
  return {
    currentStock: product.currentStockQuantity,
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    stockStatus: product.stockStatus,
    storeName: product.connectedStore.storeName,
  };
}

function toSyncStatus(cursor: CommerceSyncCursorRecord): CommercePlatformSyncStatus {
  return {
    lastAttemptedSyncedAt: cursor.lastAttemptedSyncedAt?.toISOString() ?? null,
    lastSuccessfulSyncedAt: cursor.lastSuccessfulSyncedAt?.toISOString() ?? null,
    resource: cursor.resource,
    status: cursor.status,
  };
}

function toTopProducts(
  items: readonly CommerceOrderItemRecord[],
): readonly CommercePlatformTopProduct[] {
  const products = new Map<string, CommercePlatformTopProduct>();

  items.forEach((item) => {
    if (!isRevenueEligibleOrderStatus(item.order?.orderStatus)) {
      return;
    }

    const name = item.name?.trim() || "Unknown product";
    const key = item.platformProductId ?? item.sku ?? name;
    const current = products.get(key);
    const quantitySold = Math.max(item.quantity ?? 0, 0);
    const revenue = toNumberOrNull(item.totalAmount) ?? 0;

    products.set(key, {
      name,
      platformProductId: item.platformProductId,
      quantitySold: (current?.quantitySold ?? 0) + quantitySold,
      revenue: roundMetric((current?.revenue ?? 0) + revenue),
      sku: item.sku,
    });
  });

  return [...products.values()]
    .sort((left, right) => {
      if (right.revenue !== left.revenue) {
        return right.revenue - left.revenue;
      }

      return right.quantitySold - left.quantitySold;
    })
    .slice(0, 8);
}

function sumOrders(orders: readonly CommerceOrderRecord[]): number {
  return roundMetric(
    orders.reduce(
      (total, order) =>
        total +
        (isRevenueEligibleOrderStatus(order.orderStatus)
          ? (toNumberOrNull(order.totalAmount) ?? 0)
          : 0),
      0,
    ),
  );
}

function countRevenueEligibleOrders(orders: readonly CommerceOrderRecord[]): number {
  return orders.filter((order) => isRevenueEligibleOrderStatus(order.orderStatus)).length;
}

function isLowStockProduct(product: CommerceProductRecord): boolean {
  const stockStatus = product.stockStatus?.trim().toLowerCase() ?? "";

  return (
    stockStatus.includes("low") ||
    stockStatus.includes("out") ||
    (product.currentStockQuantity !== null &&
      product.currentStockQuantity !== undefined &&
      product.currentStockQuantity <= lowStockThreshold)
  );
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? roundMetric(numericValue) : null;
}

function roundMetric(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatPlatform(platform: StorePlatform): string {
  switch (platform) {
    case StorePlatform.AmazonSeller:
      return "Amazon Seller";
    case StorePlatform.TikTokShop:
      return "TikTok Shop";
    case StorePlatform.Shopify:
      return "Shopify";
    case StorePlatform.WooCommerce:
      return "WooCommerce";
  }
}
