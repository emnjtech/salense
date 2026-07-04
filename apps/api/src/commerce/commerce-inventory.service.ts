import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import type { StorePlatform } from "../store-integrations/types/store-platform.enum.js";
import type { ListCommerceInventoryQueryDto } from "./dto/list-commerce-inventory-query.dto.js";
import type {
  CommerceInventoryInsightResponse,
  CommerceInventoryListItemResponse,
  CommerceInventoryListResponse,
  CommerceInventorySummaryResponse,
} from "./types/commerce-inventory-list-response.type.js";

interface CommerceInventoryPrismaClient {
  readonly business: {
    findUnique(args: {
      readonly where: { readonly ownerId: string };
      readonly select: { readonly id: true };
    }): Promise<{ readonly id: string } | null>;
  };
  readonly commerceProduct: {
    findMany(args: {
      readonly where: CommerceProductWhereInput;
      readonly orderBy: { readonly name: "asc" };
      readonly take: number;
      readonly select: CommerceProductSelect;
    }): Promise<readonly CommerceProductRecord[]>;
  };
  readonly commerceOrderItem: {
    findMany(args: {
      readonly where: CommerceOrderItemWhereInput;
      readonly select: CommerceOrderItemSelect;
    }): Promise<readonly CommerceOrderItemRecord[]>;
  };
  readonly commerceInventorySnapshot: {
    findMany(args: {
      readonly where: CommerceInventorySnapshotWhereInput;
      readonly orderBy: { readonly capturedAt: "asc" };
      readonly select: CommerceInventorySnapshotSelect;
    }): Promise<readonly CommerceInventorySnapshotRecord[]>;
  };
}

interface CommerceProductWhereInput {
  readonly businessId: string;
  readonly platform?: StorePlatform;
  readonly stockStatus?: string;
  readonly OR?: readonly {
    readonly name?: { readonly contains: string; readonly mode: "insensitive" };
    readonly sku?: { readonly contains: string; readonly mode: "insensitive" };
    readonly platformProductId?: { readonly contains: string; readonly mode: "insensitive" };
  }[];
}

interface CommerceOrderItemWhereInput {
  readonly businessId: string;
  readonly platformProductId: { readonly in: readonly string[] };
  readonly order: { readonly orderedAt: { readonly gte: Date } };
}

interface CommerceInventorySnapshotWhereInput {
  readonly businessId: string;
  readonly platformProductId: { readonly in: readonly string[] };
  readonly capturedAt: { readonly gte: Date };
}

interface CommerceProductSelect {
  readonly id: true;
  readonly connectedStore: { readonly select: { readonly id: true; readonly storeName: true } };
  readonly currency: true;
  readonly currentStockQuantity: true;
  readonly name: true;
  readonly platform: true;
  readonly platformProductId: true;
  readonly priceAmount: true;
  readonly sku: true;
  readonly sourceMetadata: true;
  readonly stockStatus: true;
}

interface CommerceOrderItemSelect {
  readonly connectedStoreId: true;
  readonly platform: true;
  readonly platformProductId: true;
  readonly quantity: true;
}

interface CommerceInventorySnapshotSelect {
  readonly connectedStoreId: true;
  readonly capturedAt: true;
  readonly platform: true;
  readonly platformProductId: true;
  readonly stockQuantity: true;
}

interface CommerceProductRecord {
  readonly id: string;
  readonly connectedStore: { readonly id: string; readonly storeName: string };
  readonly currency: string | null;
  readonly currentStockQuantity: number | null;
  readonly name: string | null;
  readonly platform: StorePlatform;
  readonly platformProductId: string;
  readonly priceAmount: unknown;
  readonly sku: string | null;
  readonly sourceMetadata: unknown;
  readonly stockStatus: string | null;
}

interface CommerceOrderItemRecord {
  readonly connectedStoreId: string;
  readonly platform: StorePlatform;
  readonly platformProductId: string | null;
  readonly quantity: number | null;
}

interface CommerceInventorySnapshotRecord {
  readonly connectedStoreId: string;
  readonly capturedAt: Date;
  readonly platform: StorePlatform;
  readonly platformProductId: string;
  readonly stockQuantity: number | null;
}

interface SalesSummary {
  readonly averageDailySales: number;
  readonly unitsSold: number;
}

interface SnapshotTrend {
  readonly latestValue: number;
  readonly previousValue: number | null;
}

const productSelect = {
  id: true,
  connectedStore: { select: { id: true, storeName: true } },
  currency: true,
  currentStockQuantity: true,
  name: true,
  platform: true,
  platformProductId: true,
  priceAmount: true,
  sku: true,
  sourceMetadata: true,
  stockStatus: true,
} as const;

const orderItemSelect = {
  connectedStoreId: true,
  platform: true,
  platformProductId: true,
  quantity: true,
} as const;

const inventorySnapshotSelect = {
  connectedStoreId: true,
  capturedAt: true,
  platform: true,
  platformProductId: true,
  stockQuantity: true,
} as const;

const reorderLevel = 5;
const salesWindowDays = 30;
const stockoutRiskDays = 5;

@Injectable()
export class CommerceInventoryService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async listInventory(
    userId: string,
    query: ListCommerceInventoryQueryDto,
  ): Promise<CommerceInventoryListResponse> {
    const prisma = this.prismaService.client as unknown as CommerceInventoryPrismaClient;
    const business = await prisma.business.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!business) {
      throw new UnauthorizedException(
        "Company profile is required before viewing commerce inventory.",
      );
    }

    const products = await prisma.commerceProduct.findMany({
      where: buildProductWhere(business.id, query),
      orderBy: { name: "asc" },
      take: 250,
      select: productSelect,
    });
    const productIds = [...new Set(products.map((product) => product.platformProductId))];
    const salesWindowStart = addDays(new Date(), -salesWindowDays);
    const snapshotWindowStart = addDays(new Date(), -7);
    const [orderItems, snapshots] =
      productIds.length > 0
        ? await Promise.all([
            prisma.commerceOrderItem.findMany({
              where: {
                businessId: business.id,
                platformProductId: { in: productIds },
                order: { orderedAt: { gte: salesWindowStart } },
              },
              select: orderItemSelect,
            }),
            prisma.commerceInventorySnapshot.findMany({
              where: {
                businessId: business.id,
                platformProductId: { in: productIds },
                capturedAt: { gte: snapshotWindowStart },
              },
              orderBy: { capturedAt: "asc" },
              select: inventorySnapshotSelect,
            }),
          ])
        : [[], []];
    const salesByProduct = summarizeSales(orderItems);
    const inventory = products
      .map((product) => toInventoryListItem(product, salesByProduct))
      .filter((item) => matchesInventoryFilters(item, query));

    return {
      insights: createInventoryInsights(inventory, summarizeSnapshotTrends(snapshots, products)),
      inventory,
      summary: summarizeInventory(inventory),
    };
  }
}

function buildProductWhere(
  businessId: string,
  query: ListCommerceInventoryQueryDto,
): CommerceProductWhereInput {
  return {
    businessId,
    ...(query.platform ? { platform: query.platform } : {}),
    ...(query.stockStatus ? { stockStatus: query.stockStatus } : {}),
    ...(query.search?.trim()
      ? {
          OR: [
            { name: { contains: query.search.trim(), mode: "insensitive" } },
            { sku: { contains: query.search.trim(), mode: "insensitive" } },
            { platformProductId: { contains: query.search.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function summarizeSales(
  orderItems: readonly CommerceOrderItemRecord[],
): ReadonlyMap<string, SalesSummary> {
  const totals = new Map<string, number>();

  orderItems.forEach((item) => {
    if (!item.platformProductId) {
      return;
    }

    const key = toProductKey({
      connectedStoreId: item.connectedStoreId,
      platform: item.platform,
      platformProductId: item.platformProductId,
    });

    totals.set(key, (totals.get(key) ?? 0) + Math.max(item.quantity ?? 0, 0));
  });

  return new Map(
    [...totals.entries()].map(([key, unitsSold]) => [
      key,
      {
        averageDailySales: roundMetric(unitsSold / salesWindowDays),
        unitsSold,
      },
    ]),
  );
}

function toInventoryListItem(
  product: CommerceProductRecord,
  salesByProduct: ReadonlyMap<string, SalesSummary>,
): CommerceInventoryListItemResponse {
  const sales = salesByProduct.get(toProductSalesKey(product)) ?? {
    averageDailySales: 0,
    unitsSold: 0,
  };
  const currentStock = product.currentStockQuantity;
  const price = toNumberOrNull(product.priceAmount) ?? 0;
  const inventoryValue = roundMoney(Math.max(currentStock ?? 0, 0) * price);

  return {
    averageDailySales: sales.averageDailySales,
    category: extractCategory(product.sourceMetadata),
    currentStock,
    estimatedDaysRemaining:
      currentStock !== null && currentStock !== undefined && sales.averageDailySales > 0
        ? roundMetric(Math.max(currentStock, 0) / sales.averageDailySales)
        : null,
    inventoryId: product.id,
    inventoryValue,
    platform: product.platform,
    productName: product.name,
    reorderLevel,
    sku: product.sku,
    stockStatus: product.stockStatus,
    storeName: product.connectedStore.storeName,
  };
}

function matchesInventoryFilters(
  item: CommerceInventoryListItemResponse,
  query: ListCommerceInventoryQueryDto,
): boolean {
  const categoryFilter = query.category?.trim().toLowerCase();

  return !categoryFilter || item.category?.toLowerCase() === categoryFilter;
}

function summarizeInventory(
  inventory: readonly CommerceInventoryListItemResponse[],
): CommerceInventorySummaryResponse {
  return {
    inventoryValue: roundMoney(inventory.reduce((total, item) => total + item.inventoryValue, 0)),
    lowStockProducts: inventory.filter(isLowStock).length,
    outOfStockProducts: inventory.filter(isOutOfStock).length,
  };
}

function createInventoryInsights(
  inventory: readonly CommerceInventoryListItemResponse[],
  snapshotTrends: ReadonlyMap<string, SnapshotTrend>,
): readonly CommerceInventoryInsightResponse[] {
  const insights: CommerceInventoryInsightResponse[] = [];
  const stockoutRisk = inventory
    .filter((item) => item.estimatedDaysRemaining !== null)
    .filter((item) => (item.estimatedDaysRemaining ?? Number.POSITIVE_INFINITY) <= stockoutRiskDays)
    .sort(
      (left, right) => (left.estimatedDaysRemaining ?? 0) - (right.estimatedDaysRemaining ?? 0),
    );

  if (stockoutRisk[0]) {
    insights.push({
      message: `${stockoutRisk[0].productName ?? "A product"} may run out within ${Math.ceil(
        stockoutRisk[0].estimatedDaysRemaining ?? stockoutRiskDays,
      )} days.`,
      severity: "WARNING",
      type: "STOCKOUT_RISK",
    });
  }

  const noRecentSales = inventory.find(
    (item) => (item.currentStock ?? 0) > 0 && item.averageDailySales === 0,
  );

  if (noRecentSales) {
    insights.push({
      message: `${noRecentSales.productName ?? "A product"} has not sold recently.`,
      severity: "INFO",
      type: "NO_RECENT_SALES",
    });
  }

  const lowStockCount = inventory.filter(isLowStock).length;

  if (lowStockCount > 0) {
    insights.push({
      message: `${lowStockCount} product${lowStockCount === 1 ? " is" : "s are"} at or below reorder level.`,
      severity: "WARNING",
      type: "LOW_STOCK",
    });
  }

  const currentInventoryValue = summarizeInventory(inventory).inventoryValue;
  const previousInventoryValue = [...snapshotTrends.values()].reduce(
    (total, trend) => total + (trend.previousValue ?? trend.latestValue),
    0,
  );

  if (previousInventoryValue > 0 && currentInventoryValue > previousInventoryValue) {
    insights.push({
      message: "Inventory value increased this week.",
      severity: "SUCCESS",
      type: "INVENTORY_VALUE",
    });
  }

  return insights;
}

function summarizeSnapshotTrends(
  snapshots: readonly CommerceInventorySnapshotRecord[],
  products: readonly CommerceProductRecord[],
): ReadonlyMap<string, SnapshotTrend> {
  const priceByProduct = new Map(
    products.map((product) => [
      toProductSalesKey(product),
      toNumberOrNull(product.priceAmount) ?? 0,
    ]),
  );
  const grouped = new Map<string, CommerceInventorySnapshotRecord[]>();

  snapshots.forEach((snapshot) => {
    const key = toProductKey(snapshot);
    grouped.set(key, [...(grouped.get(key) ?? []), snapshot]);
  });

  return new Map(
    [...grouped.entries()].map(([key, productSnapshots]) => {
      const price = priceByProduct.get(key) ?? 0;
      const latest = productSnapshots[productSnapshots.length - 1];
      const previous = productSnapshots.length > 1 ? productSnapshots[0] : null;

      return [
        key,
        {
          latestValue: roundMoney(Math.max(latest?.stockQuantity ?? 0, 0) * price),
          previousValue: previous
            ? roundMoney(Math.max(previous.stockQuantity ?? 0, 0) * price)
            : null,
        },
      ];
    }),
  );
}

function isLowStock(item: CommerceInventoryListItemResponse): boolean {
  const normalizedStatus = item.stockStatus?.toLowerCase() ?? "";

  return (
    normalizedStatus.includes("low") ||
    normalizedStatus.includes("out") ||
    (item.currentStock !== null &&
      item.currentStock !== undefined &&
      item.currentStock <= reorderLevel)
  );
}

function isOutOfStock(item: CommerceInventoryListItemResponse): boolean {
  const normalizedStatus = item.stockStatus?.toLowerCase() ?? "";

  return normalizedStatus.includes("out") || item.currentStock === 0;
}

function toProductSalesKey(product: CommerceProductRecord): string {
  return toProductKey({
    connectedStoreId: product.connectedStore.id,
    platform: product.platform,
    platformProductId: product.platformProductId,
  });
}

function toProductKey(input: {
  readonly connectedStoreId: string;
  readonly platform: StorePlatform;
  readonly platformProductId: string;
}): string {
  return `${input.connectedStoreId}:${input.platform}:${input.platformProductId}`;
}

function extractCategory(sourceMetadata: unknown): string | null {
  const raw = getRecord(getRecord(sourceMetadata)?.raw);
  const categories = raw?.categories;

  if (!Array.isArray(categories)) {
    return null;
  }

  const firstCategory = categories.map(getRecord).find((category) => getString(category?.name));

  return getString(firstCategory?.name);
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? roundMoney(numericValue) : null;
}

function addDays(date: Date, days: number): Date {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}
