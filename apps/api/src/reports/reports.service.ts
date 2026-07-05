import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import type { StorePlatform } from "../store-integrations/types/store-platform.enum.js";
import type { ReportsOverviewQueryDto } from "./dto/reports-overview-query.dto.js";
import type {
  ReportsInventorySummary,
  ReportsOverviewResponse,
  ReportsPlatformMetric,
  ReportsStoreFilterOption,
  ReportsTopCustomer,
  ReportsTopProduct,
  ReportsTrendPoint,
} from "./types/reports-overview-response.type.js";

interface ReportsPrismaClient {
  readonly business: {
    findUnique(args: {
      readonly where: { readonly ownerId: string };
      readonly select: { readonly id: true };
    }): Promise<{ readonly id: string } | null>;
  };
  readonly connectedStore: {
    findMany(args: {
      readonly where: { readonly businessId: string; readonly platform?: StorePlatform };
      readonly orderBy: { readonly storeName: "asc" };
      readonly select: {
        readonly id: true;
        readonly platform: true;
        readonly storeName: true;
      };
    }): Promise<readonly ReportsStoreRecord[]>;
  };
  readonly commerceOrder: {
    findMany(args: {
      readonly where: ReportsDateScopedWhereInput;
      readonly orderBy: { readonly orderedAt: "asc" };
      readonly select: ReportsOrderSelect;
    }): Promise<readonly ReportsOrderRecord[]>;
  };
  readonly commerceOrderItem: {
    findMany(args: {
      readonly where: ReportsOrderItemWhereInput;
      readonly select: ReportsOrderItemSelect;
    }): Promise<readonly ReportsOrderItemRecord[]>;
  };
  readonly commerceProduct: {
    findMany(args: {
      readonly where: ReportsStoreScopedWhereInput;
      readonly select: ReportsProductSelect;
    }): Promise<readonly ReportsProductRecord[]>;
  };
  readonly commerceCustomer: {
    findMany(args: {
      readonly where: ReportsStoreScopedWhereInput;
      readonly select: ReportsCustomerSelect;
    }): Promise<readonly ReportsCustomerRecord[]>;
  };
  readonly commerceRefund: {
    findMany(args: {
      readonly where: ReportsRefundWhereInput;
      readonly select: { readonly id: true };
    }): Promise<readonly { readonly id: string }[]>;
  };
}

interface ReportsStoreScopedWhereInput {
  readonly businessId: string;
  readonly connectedStoreId?: string;
  readonly platform?: StorePlatform;
}

interface ReportsDateScopedWhereInput extends ReportsStoreScopedWhereInput {
  readonly orderedAt: {
    readonly gte: Date;
    readonly lte: Date;
  };
}

interface ReportsOrderItemWhereInput extends ReportsStoreScopedWhereInput {
  readonly order: {
    readonly orderedAt: {
      readonly gte: Date;
      readonly lte: Date;
    };
  };
}

interface ReportsRefundWhereInput extends ReportsStoreScopedWhereInput {
  readonly refundedAt: {
    readonly gte: Date;
    readonly lte: Date;
  };
}

interface ReportsStoreRecord {
  readonly id: string;
  readonly platform: StorePlatform;
  readonly storeName: string;
}

interface ReportsOrderSelect {
  readonly connectedStoreId: true;
  readonly id: true;
  readonly orderedAt: true;
  readonly platform: true;
  readonly sourceMetadata: true;
  readonly totalAmount: true;
}

interface ReportsOrderRecord {
  readonly connectedStoreId: string;
  readonly id: string;
  readonly orderedAt: Date | null;
  readonly platform: StorePlatform;
  readonly sourceMetadata: unknown;
  readonly totalAmount: unknown;
}

interface ReportsOrderItemSelect {
  readonly connectedStoreId: true;
  readonly name: true;
  readonly platform: true;
  readonly platformProductId: true;
  readonly quantity: true;
  readonly sku: true;
  readonly totalAmount: true;
}

interface ReportsOrderItemRecord {
  readonly connectedStoreId: string;
  readonly name: string | null;
  readonly platform: StorePlatform;
  readonly platformProductId: string | null;
  readonly quantity: number | null;
  readonly sku: string | null;
  readonly totalAmount: unknown;
}

interface ReportsProductSelect {
  readonly connectedStoreId: true;
  readonly currentStockQuantity: true;
  readonly id: true;
  readonly name: true;
  readonly platform: true;
  readonly platformProductId: true;
  readonly priceAmount: true;
  readonly sku: true;
  readonly stockStatus: true;
}

interface ReportsProductRecord {
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

interface ReportsCustomerSelect {
  readonly connectedStoreId: true;
  readonly email: true;
  readonly firstName: true;
  readonly id: true;
  readonly lastName: true;
  readonly platform: true;
  readonly username: true;
}

interface ReportsCustomerRecord {
  readonly connectedStoreId: string;
  readonly email: string | null;
  readonly firstName: string | null;
  readonly id: string;
  readonly lastName: string | null;
  readonly platform: StorePlatform;
  readonly username: string | null;
}

interface DateRange {
  readonly dateFrom: Date;
  readonly dateTo: Date;
}

interface CustomerSummaryAccumulator {
  readonly customerId: string | null;
  readonly customerName: string;
  lifetimeSpend: number;
  orders: number;
}

const lowStockThreshold = 5;

const orderSelect = {
  connectedStoreId: true,
  id: true,
  orderedAt: true,
  platform: true,
  sourceMetadata: true,
  totalAmount: true,
} as const;

const orderItemSelect = {
  connectedStoreId: true,
  name: true,
  platform: true,
  platformProductId: true,
  quantity: true,
  sku: true,
  totalAmount: true,
} as const;

const productSelect = {
  connectedStoreId: true,
  currentStockQuantity: true,
  id: true,
  name: true,
  platform: true,
  platformProductId: true,
  priceAmount: true,
  sku: true,
  stockStatus: true,
} as const;

const customerSelect = {
  connectedStoreId: true,
  email: true,
  firstName: true,
  id: true,
  lastName: true,
  platform: true,
  username: true,
} as const;

@Injectable()
export class ReportsService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async getOverview(
    userId: string,
    query: ReportsOverviewQueryDto,
  ): Promise<ReportsOverviewResponse> {
    const prisma = this.prismaService.client as unknown as ReportsPrismaClient;
    const business = await prisma.business.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!business) {
      throw new UnauthorizedException("Company profile is required before viewing reports.");
    }

    const dateRange = getDateRange(query);
    const storeScopedWhere = buildStoreScopedWhere(business.id, query);
    const dateScopedWhere = {
      ...storeScopedWhere,
      orderedAt: { gte: dateRange.dateFrom, lte: dateRange.dateTo },
    };
    const [stores, orders, orderItems, products, customers, refunds] = await Promise.all([
      prisma.connectedStore.findMany({
        where: {
          businessId: business.id,
          ...(query.platform ? { platform: query.platform } : {}),
        },
        orderBy: { storeName: "asc" },
        select: { id: true, platform: true, storeName: true },
      }),
      prisma.commerceOrder.findMany({
        where: dateScopedWhere,
        orderBy: { orderedAt: "asc" },
        select: orderSelect,
      }),
      prisma.commerceOrderItem.findMany({
        where: {
          ...storeScopedWhere,
          order: { orderedAt: { gte: dateRange.dateFrom, lte: dateRange.dateTo } },
        },
        select: orderItemSelect,
      }),
      prisma.commerceProduct.findMany({
        where: storeScopedWhere,
        select: productSelect,
      }),
      prisma.commerceCustomer.findMany({
        where: storeScopedWhere,
        select: customerSelect,
      }),
      prisma.commerceRefund.findMany({
        where: {
          ...storeScopedWhere,
          refundedAt: { gte: dateRange.dateFrom, lte: dateRange.dateTo },
        },
        select: { id: true },
      }),
    ]);
    const revenue = sumOrders(orders);

    return {
      filters: {
        dateFrom: dateRange.dateFrom.toISOString(),
        dateTo: dateRange.dateTo.toISOString(),
        platform: query.platform ?? null,
        store: query.store ?? null,
      },
      inventory: summarizeInventory(products),
      kpis: {
        averageOrderValue: roundMetric(orders.length > 0 ? revenue / orders.length : 0),
        businessHealthScore: calculateBusinessHealthScore({
          inventoryRisk: summarizeInventory(products).inventoryRisk,
          orders: orders.length,
          refunds: refunds.length,
          revenue,
        }),
        orders: orders.length,
        refunds: refunds.length,
        revenue,
      },
      ordersByPlatform: toOrdersByPlatform(orders),
      ordersTrend: toOrdersTrend(orders, dateRange),
      revenueByPlatform: toRevenueByPlatform(orders),
      revenueTrend: toRevenueTrend(orders, dateRange),
      stores: stores.map(toStoreFilterOption),
      topCustomers: toTopCustomers(customers, orders),
      topProducts: toTopProducts(orderItems, products),
    };
  }
}

function buildStoreScopedWhere(
  businessId: string,
  query: ReportsOverviewQueryDto,
): ReportsStoreScopedWhereInput {
  return {
    businessId,
    ...(query.platform ? { platform: query.platform } : {}),
    ...(query.store?.trim() ? { connectedStoreId: query.store.trim() } : {}),
  };
}

function getDateRange(query: ReportsOverviewQueryDto): DateRange {
  const now = new Date();
  const defaultStart = new Date(now);
  defaultStart.setUTCDate(defaultStart.getUTCDate() - 29);
  defaultStart.setUTCHours(0, 0, 0, 0);

  const dateFrom = query.dateFrom ? new Date(query.dateFrom) : defaultStart;
  const dateTo = query.dateTo ? new Date(query.dateTo) : now;

  dateFrom.setUTCHours(0, 0, 0, 0);
  dateTo.setUTCHours(23, 59, 59, 999);

  return dateFrom <= dateTo ? { dateFrom, dateTo } : { dateFrom: dateTo, dateTo: dateFrom };
}

function toRevenueTrend(
  orders: readonly ReportsOrderRecord[],
  dateRange: DateRange,
): readonly ReportsTrendPoint[] {
  const buckets = createDailyBuckets(dateRange);

  orders.forEach((order) => {
    if (!order.orderedAt) {
      return;
    }

    const dateKey = toDateKey(order.orderedAt);
    buckets.set(dateKey, roundMetric((buckets.get(dateKey) ?? 0) + toNumber(order.totalAmount)));
  });

  return [...buckets.entries()].map(([date, value]) => ({ date, value }));
}

function toOrdersTrend(
  orders: readonly ReportsOrderRecord[],
  dateRange: DateRange,
): readonly ReportsTrendPoint[] {
  const buckets = createDailyBuckets(dateRange);

  orders.forEach((order) => {
    if (!order.orderedAt) {
      return;
    }

    const dateKey = toDateKey(order.orderedAt);
    buckets.set(dateKey, (buckets.get(dateKey) ?? 0) + 1);
  });

  return [...buckets.entries()].map(([date, value]) => ({ date, value }));
}

function createDailyBuckets(dateRange: DateRange): Map<string, number> {
  const buckets = new Map<string, number>();
  const cursor = new Date(dateRange.dateFrom);

  cursor.setUTCHours(0, 0, 0, 0);

  while (cursor <= dateRange.dateTo) {
    buckets.set(toDateKey(cursor), 0);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return buckets;
}

function toRevenueByPlatform(
  orders: readonly ReportsOrderRecord[],
): readonly ReportsPlatformMetric[] {
  const totals = new Map<StorePlatform, number>();

  orders.forEach((order) => {
    totals.set(
      order.platform,
      roundMetric((totals.get(order.platform) ?? 0) + toNumber(order.totalAmount)),
    );
  });

  return toSortedPlatformMetrics(totals);
}

function toOrdersByPlatform(
  orders: readonly ReportsOrderRecord[],
): readonly ReportsPlatformMetric[] {
  const totals = new Map<StorePlatform, number>();

  orders.forEach((order) => {
    totals.set(order.platform, (totals.get(order.platform) ?? 0) + 1);
  });

  return toSortedPlatformMetrics(totals);
}

function toTopProducts(
  items: readonly ReportsOrderItemRecord[],
  products: readonly ReportsProductRecord[],
): readonly ReportsTopProduct[] {
  const productInventory = new Map(
    products.map((product) => [
      toProductKey({
        connectedStoreId: product.connectedStoreId,
        platform: product.platform,
        platformProductId: product.platformProductId,
      }),
      { inventory: product.currentStockQuantity, productId: product.id },
    ]),
  );
  const summaries = new Map<string, ReportsTopProduct>();

  items.forEach((item) => {
    const name = item.name?.trim() || "Unknown product";
    const key = item.platformProductId
      ? toProductKey({
          connectedStoreId: item.connectedStoreId,
          platform: item.platform,
          platformProductId: item.platformProductId,
        })
      : `${item.connectedStoreId}:${item.platform}:${item.sku ?? name}`;
    const current = summaries.get(key);
    const inventory = productInventory.get(key);

    summaries.set(key, {
      inventory: inventory?.inventory ?? null,
      platform: item.platform,
      productId: inventory?.productId ?? null,
      productName: name,
      revenue: roundMetric((current?.revenue ?? 0) + toNumber(item.totalAmount)),
      sku: item.sku,
      unitsSold: (current?.unitsSold ?? 0) + Math.max(item.quantity ?? 0, 0),
    });
  });

  return [...summaries.values()]
    .sort((left, right) => {
      if (right.revenue !== left.revenue) {
        return right.revenue - left.revenue;
      }

      return right.unitsSold - left.unitsSold;
    })
    .slice(0, 8);
}

function toTopCustomers(
  customers: readonly ReportsCustomerRecord[],
  orders: readonly ReportsOrderRecord[],
): readonly ReportsTopCustomer[] {
  const customersByEmail = new Map<string, ReportsCustomerRecord>();

  customers.forEach((customer) => {
    if (customer.email) {
      customersByEmail.set(
        toCustomerEmailKey(customer.connectedStoreId, customer.platform, customer.email),
        customer,
      );
    }
  });

  const summaries = new Map<string, CustomerSummaryAccumulator>();

  orders.forEach((order) => {
    const email = extractOrderEmail(order.sourceMetadata);
    const customer = email
      ? customersByEmail.get(toCustomerEmailKey(order.connectedStoreId, order.platform, email))
      : undefined;
    const key = customer?.id ?? email ?? order.id;
    const current = summaries.get(key) ?? {
      customerId: customer?.id ?? null,
      customerName: customer ? formatCustomerName(customer) : (email ?? "Guest customer"),
      lifetimeSpend: 0,
      orders: 0,
    };

    current.lifetimeSpend = roundMetric(current.lifetimeSpend + toNumber(order.totalAmount));
    current.orders += 1;
    summaries.set(key, current);
  });

  return [...summaries.values()]
    .map((customer) => ({
      averageOrderValue: roundMetric(
        customer.orders > 0 ? customer.lifetimeSpend / customer.orders : 0,
      ),
      customerId: customer.customerId,
      customerName: customer.customerName,
      lifetimeSpend: customer.lifetimeSpend,
      orders: customer.orders,
    }))
    .sort((left, right) => {
      if (right.lifetimeSpend !== left.lifetimeSpend) {
        return right.lifetimeSpend - left.lifetimeSpend;
      }

      return right.orders - left.orders;
    })
    .slice(0, 8);
}

function summarizeInventory(products: readonly ReportsProductRecord[]): ReportsInventorySummary {
  const inventoryValue = products.reduce(
    (total, product) =>
      total + Math.max(product.currentStockQuantity ?? 0, 0) * toNumber(product.priceAmount),
    0,
  );
  const lowStock = products.filter(isLowStock).length;
  const outOfStock = products.filter(isOutOfStock).length;

  return {
    inventoryRisk: lowStock + outOfStock,
    inventoryValue: roundMetric(inventoryValue),
    lowStock,
    outOfStock,
  };
}

function calculateBusinessHealthScore(input: {
  readonly inventoryRisk: number;
  readonly orders: number;
  readonly refunds: number;
  readonly revenue: number;
}): number {
  let score = 55;

  if (input.revenue > 0) score += 15;
  if (input.orders > 0) score += 15;
  if (input.refunds === 0) score += 5;
  score -= Math.min(input.refunds * 3, 15);
  score -= Math.min(input.inventoryRisk * 4, 25);

  return Math.max(0, Math.min(100, score));
}

function toSortedPlatformMetrics(
  totals: ReadonlyMap<StorePlatform, number>,
): readonly ReportsPlatformMetric[] {
  return [...totals.entries()]
    .map(([platform, value]) => ({ platform, value: roundMetric(value) }))
    .sort((left, right) => {
      if (right.value !== left.value) {
        return right.value - left.value;
      }

      return left.platform.localeCompare(right.platform);
    });
}

function sumOrders(orders: readonly ReportsOrderRecord[]): number {
  return roundMetric(orders.reduce((total, order) => total + toNumber(order.totalAmount), 0));
}

function toStoreFilterOption(store: ReportsStoreRecord): ReportsStoreFilterOption {
  return {
    id: store.id,
    platform: store.platform,
    storeName: store.storeName,
  };
}

function isLowStock(product: ReportsProductRecord): boolean {
  const normalizedStatus = product.stockStatus?.toLowerCase() ?? "";

  return (
    normalizedStatus.includes("low") ||
    normalizedStatus.includes("out") ||
    (product.currentStockQuantity !== null &&
      product.currentStockQuantity !== undefined &&
      product.currentStockQuantity <= lowStockThreshold)
  );
}

function isOutOfStock(product: ReportsProductRecord): boolean {
  const normalizedStatus = product.stockStatus?.toLowerCase() ?? "";

  return normalizedStatus.includes("out") || product.currentStockQuantity === 0;
}

function formatCustomerName(customer: ReportsCustomerRecord): string {
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim();

  return name || customer.username || customer.email || "Guest customer";
}

function extractOrderEmail(sourceMetadata: unknown): string | null {
  const raw = getRecord(getRecord(sourceMetadata)?.raw);
  const billing = getRecord(raw?.billing);
  const shipping = getRecord(raw?.shipping);

  return (
    (
      getString(billing?.email) ??
      getString(shipping?.email) ??
      getString(raw?.billing_email) ??
      getString(raw?.customer_email)
    )?.toLowerCase() ?? null
  );
}

function toProductKey(input: {
  readonly connectedStoreId: string;
  readonly platform: StorePlatform;
  readonly platformProductId: string;
}): string {
  return `${input.connectedStoreId}:${input.platform}:${input.platformProductId}`;
}

function toCustomerEmailKey(
  connectedStoreId: string,
  platform: StorePlatform,
  email: string,
): string {
  return `${connectedStoreId}:${platform}:${email.trim().toLowerCase()}`;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
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
