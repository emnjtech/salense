import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { StoreConnectionStatus } from "../store-integrations/types/store-connection-status.enum.js";
import { StorePlatform } from "../store-integrations/types/store-platform.enum.js";
import type {
  PlatformMetric,
  RuleBasedInsight,
  TodayDashboardResponse,
  TopProductToday,
} from "./types/today-dashboard-response.type.js";

interface DashboardPrismaClient {
  readonly business: {
    findUnique(args: {
      readonly where: { readonly ownerId: string };
      readonly select: { readonly id: true; readonly name: true };
    }): Promise<{ readonly id: string; readonly name: string } | null>;
  };
  readonly connectedStore: {
    findMany(args: {
      readonly where: {
        readonly businessId: string;
        readonly connectionStatus?: StoreConnectionStatus;
      };
      readonly select: {
        readonly id: true;
        readonly platform: true;
      };
    }): Promise<readonly ConnectedStoreDashboardRecord[]>;
  };
  readonly commerceOrder: {
    findMany(args: {
      readonly where: {
        readonly businessId: string;
        readonly orderedAt: { readonly gte: Date; readonly lt: Date };
      };
      readonly select: {
        readonly id: true;
        readonly platform: true;
        readonly totalAmount: true;
      };
    }): Promise<readonly CommerceOrderDashboardRecord[]>;
  };
  readonly commerceOrderItem: {
    findMany(args: {
      readonly where: {
        readonly businessId: string;
        readonly order: {
          readonly orderedAt: { readonly gte: Date; readonly lt: Date };
        };
      };
      readonly select: {
        readonly name: true;
        readonly platform: true;
        readonly quantity: true;
        readonly sku: true;
        readonly totalAmount: true;
      };
    }): Promise<readonly CommerceOrderItemDashboardRecord[]>;
  };
  readonly commerceRefund: {
    findMany(args: {
      readonly where: {
        readonly businessId: string;
        readonly refundedAt: { readonly gte: Date; readonly lt: Date };
      };
      readonly select: { readonly id: true };
    }): Promise<readonly { readonly id: string }[]>;
  };
  readonly commerceProduct: {
    findMany(args: {
      readonly where: { readonly businessId: string };
      readonly select: {
        readonly currentStockQuantity: true;
        readonly stockStatus: true;
      };
    }): Promise<readonly CommerceProductDashboardRecord[]>;
  };
}

interface ConnectedStoreDashboardRecord {
  readonly id: string;
  readonly platform: StorePlatform;
}

interface CommerceOrderDashboardRecord {
  readonly id: string;
  readonly platform: StorePlatform;
  readonly totalAmount: unknown;
}

interface CommerceOrderItemDashboardRecord {
  readonly name: string | null;
  readonly platform: StorePlatform;
  readonly quantity: number | null;
  readonly sku: string | null;
  readonly totalAmount: unknown;
}

interface CommerceProductDashboardRecord {
  readonly currentStockQuantity: number | null;
  readonly stockStatus: string | null;
}

interface DateRange {
  readonly gte: Date;
  readonly lt: Date;
}

const lowStockThreshold = 5;

@Injectable()
export class DashboardService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async getTodayDashboard(userId: string): Promise<TodayDashboardResponse> {
    const prisma = this.prismaService.client as unknown as DashboardPrismaClient;
    const business = await prisma.business.findUnique({
      where: { ownerId: userId },
      select: { id: true, name: true },
    });

    if (!business) {
      throw new UnauthorizedException(
        "Company profile is required before viewing dashboard analytics.",
      );
    }

    const { today, yesterday } = getDashboardDateRanges(new Date());
    const [activeStores, todayOrders, yesterdayOrders, todayOrderItems, todayRefunds, products] =
      await Promise.all([
        prisma.connectedStore.findMany({
          where: { businessId: business.id, connectionStatus: StoreConnectionStatus.Connected },
          select: { id: true, platform: true },
        }),
        prisma.commerceOrder.findMany({
          where: { businessId: business.id, orderedAt: today },
          select: { id: true, platform: true, totalAmount: true },
        }),
        prisma.commerceOrder.findMany({
          where: { businessId: business.id, orderedAt: yesterday },
          select: { id: true, platform: true, totalAmount: true },
        }),
        prisma.commerceOrderItem.findMany({
          where: { businessId: business.id, order: { orderedAt: today } },
          select: { name: true, platform: true, quantity: true, sku: true, totalAmount: true },
        }),
        prisma.commerceRefund.findMany({
          where: { businessId: business.id, refundedAt: today },
          select: { id: true },
        }),
        prisma.commerceProduct.findMany({
          where: { businessId: business.id },
          select: { currentStockQuantity: true, stockStatus: true },
        }),
      ]);

    const todayRevenue = sumOrders(todayOrders);
    const yesterdayRevenue = sumOrders(yesterdayOrders);
    const revenueByPlatform = toRevenueByPlatform(todayOrders);
    const ordersByPlatform = toOrdersByPlatform(todayOrders);
    const lowStockCount = products.filter(isLowStockProduct).length;
    const connectedPlatforms = [...new Set(activeStores.map((store) => store.platform))].sort();
    const productsSoldToday = todayOrderItems.reduce(
      (total, item) => total + Math.max(item.quantity ?? 0, 0),
      0,
    );
    const hasCommerceData =
      todayOrders.length > 0 ||
      yesterdayOrders.length > 0 ||
      todayOrderItems.length > 0 ||
      todayRefunds.length > 0 ||
      products.length > 0;
    const topProductToday = getTopProductToday(todayOrderItems);
    const bestPlatformToday = revenueByPlatform[0]?.platform ?? null;
    const basicBusinessHealthScore = hasCommerceData
      ? calculateBusinessHealthScore({
          activeStores: activeStores.length,
          lowStockCount,
          revenueChangePercent: calculateRevenueChangePercent(todayRevenue, yesterdayRevenue),
          todayRevenue,
        })
      : null;

    return {
      activeStores: activeStores.length,
      averageOrderValueToday: roundMetric(
        todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0,
      ),
      basicBusinessHealthScore,
      basicRuleBasedInsights: createRuleBasedInsights({
        activeStores: activeStores.length,
        bestPlatformToday,
        lowStockCount,
        revenueChangePercent: calculateRevenueChangePercent(todayRevenue, yesterdayRevenue),
        todayRevenue,
        topProductToday,
      }),
      bestPlatformToday,
      businessName: business.name,
      connectedPlatforms,
      hasCommerceData,
      lowStockCount,
      ordersByPlatform,
      ordersToday: todayOrders.length,
      productsSoldToday,
      refundCountToday: todayRefunds.length,
      revenueByPlatform,
      revenueChangePercent: calculateRevenueChangePercent(todayRevenue, yesterdayRevenue),
      todayRevenue: roundMetric(todayRevenue),
      topProductToday,
      yesterdayRevenue: roundMetric(yesterdayRevenue),
    };
  }
}

function getDashboardDateRanges(now: Date): {
  readonly today: DateRange;
  readonly yesterday: DateRange;
} {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  return {
    today: { gte: todayStart, lt: tomorrowStart },
    yesterday: { gte: yesterdayStart, lt: todayStart },
  };
}

function sumOrders(orders: readonly CommerceOrderDashboardRecord[]): number {
  return roundMetric(orders.reduce((total, order) => total + toNumber(order.totalAmount), 0));
}

function toRevenueByPlatform(
  orders: readonly CommerceOrderDashboardRecord[],
): readonly PlatformMetric[] {
  const totals = new Map<StorePlatform, number>();

  orders.forEach((order) => {
    totals.set(order.platform, (totals.get(order.platform) ?? 0) + toNumber(order.totalAmount));
  });

  return [...totals.entries()]
    .map(([platform, value]) => ({ platform, value: roundMetric(value) }))
    .sort(sortPlatformMetrics);
}

function toOrdersByPlatform(
  orders: readonly CommerceOrderDashboardRecord[],
): readonly PlatformMetric[] {
  const totals = new Map<StorePlatform, number>();

  orders.forEach((order) => {
    totals.set(order.platform, (totals.get(order.platform) ?? 0) + 1);
  });

  return [...totals.entries()]
    .map(([platform, value]) => ({ platform, value }))
    .sort(sortPlatformMetrics);
}

function getTopProductToday(
  items: readonly CommerceOrderItemDashboardRecord[],
): TopProductToday | null {
  const products = new Map<string, TopProductToday>();

  items.forEach((item) => {
    const name = item.name?.trim() || "Unknown product";
    const key = `${item.platform}:${item.sku ?? name}`;
    const current = products.get(key);
    const quantity = Math.max(item.quantity ?? 0, 0);
    const revenue = toNumber(item.totalAmount);

    products.set(key, {
      name,
      platform: item.platform,
      quantitySold: (current?.quantitySold ?? 0) + quantity,
      revenue: roundMetric((current?.revenue ?? 0) + revenue),
      sku: item.sku,
    });
  });

  return (
    [...products.values()].sort((left, right) => {
      if (right.quantitySold !== left.quantitySold) {
        return right.quantitySold - left.quantitySold;
      }

      return right.revenue - left.revenue;
    })[0] ?? null
  );
}

function calculateRevenueChangePercent(
  todayRevenue: number,
  yesterdayRevenue: number,
): number | null {
  if (yesterdayRevenue === 0) {
    return todayRevenue > 0 ? 100 : null;
  }

  return roundMetric(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100);
}

function calculateBusinessHealthScore(input: {
  readonly activeStores: number;
  readonly lowStockCount: number;
  readonly revenueChangePercent: number | null;
  readonly todayRevenue: number;
}): number {
  let score = 50;

  if (input.activeStores > 0) score += 15;
  if (input.todayRevenue > 0) score += 15;
  if ((input.revenueChangePercent ?? 0) > 0) score += 10;
  if ((input.revenueChangePercent ?? 0) < -10) score -= 15;
  score -= Math.min(input.lowStockCount * 5, 25);

  return Math.max(0, Math.min(100, score));
}

function createRuleBasedInsights(input: {
  readonly activeStores: number;
  readonly bestPlatformToday: StorePlatform | null;
  readonly lowStockCount: number;
  readonly revenueChangePercent: number | null;
  readonly todayRevenue: number;
  readonly topProductToday: TopProductToday | null;
}): readonly RuleBasedInsight[] {
  const insights: RuleBasedInsight[] = [];

  if (input.activeStores === 0) {
    insights.push({
      message: "Connect at least one store to begin unified commerce analysis.",
      severity: "WARNING",
      type: "CONNECTION",
    });
  }

  if (input.bestPlatformToday) {
    insights.push({
      message: `${formatPlatform(input.bestPlatformToday)} is today's strongest revenue channel.`,
      severity: "SUCCESS",
      type: "REVENUE",
    });
  }

  if (input.revenueChangePercent !== null) {
    insights.push({
      message:
        input.revenueChangePercent >= 0
          ? `Revenue is up ${input.revenueChangePercent}% compared with yesterday.`
          : `Revenue is down ${Math.abs(input.revenueChangePercent)}% compared with yesterday.`,
      severity: input.revenueChangePercent >= 0 ? "SUCCESS" : "WARNING",
      type: "REVENUE",
    });
  }

  if (input.topProductToday) {
    insights.push({
      message: `${input.topProductToday.name} is today's top product by units sold.`,
      severity: "INFO",
      type: "SALES",
    });
  }

  if (input.lowStockCount > 0) {
    insights.push({
      message: `${input.lowStockCount} product${input.lowStockCount === 1 ? "" : "s"} need inventory attention.`,
      severity: "WARNING",
      type: "INVENTORY",
    });
  }

  if (insights.length === 0 && input.todayRevenue === 0) {
    insights.push({
      message: "No sales activity has been imported for today yet.",
      severity: "INFO",
      type: "SALES",
    });
  }

  return insights;
}

function isLowStockProduct(product: CommerceProductDashboardRecord): boolean {
  const stockStatus = product.stockStatus?.trim().toLowerCase();

  return (
    (product.currentStockQuantity !== null &&
      product.currentStockQuantity !== undefined &&
      product.currentStockQuantity <= lowStockThreshold) ||
    stockStatus === "outofstock" ||
    stockStatus === "out_of_stock" ||
    stockStatus === "lowstock" ||
    stockStatus === "low_stock"
  );
}

function sortPlatformMetrics(left: PlatformMetric, right: PlatformMetric): number {
  if (right.value !== left.value) {
    return right.value - left.value;
  }

  return left.platform.localeCompare(right.platform);
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value) || 0;
  }

  if (value && typeof value === "object" && "toString" in value) {
    return Number(value.toString()) || 0;
  }

  return 0;
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
