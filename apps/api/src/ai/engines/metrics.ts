import { isRevenueEligibleOrderStatus } from "../../commerce/order-revenue.js";
import type { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";
import type { AiMetrics, AiOrderRecord, AiSourceData } from "../types/ai-source-data.type.js";

export function buildAiMetrics(data: AiSourceData): AiMetrics {
  const todayKey = toDateKey(data.now);
  const yesterdayKey = toDateKey(addDays(data.now, -1));
  const sevenDaysAgo = startOfDay(addDays(data.now, -6));
  const platformRevenue = new Map<StorePlatform, number>();
  const productRevenue = new Map<string, { name: string; revenue: number; unitsSold: number }>();

  let revenueToday = 0;
  let revenueYesterday = 0;
  let revenueLast7Days = 0;
  let ordersToday = 0;
  let ordersYesterday = 0;
  let revenueEligibleOrders = 0;

  for (const order of data.orders) {
    const orderDate = order.orderedAt;
    const orderDay = orderDate ? toDateKey(orderDate) : null;
    const isRevenueEligible = isRevenueEligibleOrderStatus(order.orderStatus);
    const orderRevenue = isRevenueEligible ? toNumber(order.totalAmount) : 0;

    if (orderDay === todayKey) {
      ordersToday += 1;
      revenueToday += orderRevenue;
    }

    if (orderDay === yesterdayKey) {
      ordersYesterday += 1;
      revenueYesterday += orderRevenue;
    }

    if (orderDate && orderDate >= sevenDaysAgo) {
      revenueLast7Days += orderRevenue;
    }

    if (isRevenueEligible) {
      revenueEligibleOrders += 1;
      platformRevenue.set(order.platform, (platformRevenue.get(order.platform) ?? 0) + orderRevenue);
    }
  }

  for (const item of data.orderItems) {
    if (!isRevenueEligibleOrderStatus(item.order?.orderStatus)) {
      continue;
    }

    const key = item.platformProductId ?? item.name ?? "Unknown product";
    const current = productRevenue.get(key) ?? {
      name: item.name ?? "Unknown product",
      revenue: 0,
      unitsSold: 0,
    };

    current.revenue += toNumber(item.totalAmount);
    current.unitsSold += item.quantity ?? 0;
    productRevenue.set(key, current);
  }

  const topPlatformByRevenue = [...platformRevenue.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([platform, revenue]) => ({ platform, revenue }))[0] ?? null;

  const topProduct = [...productRevenue.values()].sort((a, b) => b.revenue - a.revenue)[0] ?? null;

  return {
    connectedPlatforms: [...new Set(data.connectedStores.map((store) => store.platform))],
    synchronizedStores: data.connectedStores.filter((store) => store.lastSynchronisedAt !== null).length,
    revenueToday,
    revenueYesterday,
    revenueLast7Days,
    ordersToday,
    ordersYesterday,
    revenueEligibleOrders,
    refundsToday: data.refunds.filter((refund) => refund.refundedAt && toDateKey(refund.refundedAt) === todayKey).length,
    lowStockProducts: data.products.filter((product) => isLowStock(product.stockStatus, product.currentStockQuantity)).length,
    outOfStockProducts: data.products.filter((product) => isOutOfStock(product.stockStatus, product.currentStockQuantity)).length,
    productsTracked: data.products.length,
    customersTracked: data.customers.length,
    topPlatformByRevenue,
    topProduct,
  };
}

export function hasSufficientAiData(data: AiSourceData): boolean {
  return data.connectedStores.length > 0 && data.connectedStores.some((store) => store.lastSynchronisedAt) && data.orders.some(hasRevenueEligibleOrder);
}

export function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof value === "object" && value !== null && "toNumber" in value) {
    const numeric = (value as { toNumber(): number }).toNumber();
    return Number.isFinite(numeric) ? numeric : 0;
  }

  return 0;
}

export function percentageChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current > 0 ? 100 : null;
  }

  return Math.round(((current - previous) / previous) * 100);
}

function hasRevenueEligibleOrder(order: AiOrderRecord): boolean {
  return isRevenueEligibleOrderStatus(order.orderStatus);
}

function isLowStock(status: string | null, quantity: number | null): boolean {
  const normalizedStatus = status?.toLowerCase().replaceAll("-", "_");
  return normalizedStatus === "low_stock" || (quantity !== null && quantity > 0 && quantity <= 5);
}

function isOutOfStock(status: string | null, quantity: number | null): boolean {
  const normalizedStatus = status?.toLowerCase().replaceAll("-", "_");
  return normalizedStatus === "out_of_stock" || quantity === 0;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}
