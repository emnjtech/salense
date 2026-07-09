import { Inject, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { StoreConnectionStatus } from "../store-integrations/types/store-connection-status.enum.js";
import { StorePlatform } from "../store-integrations/types/store-platform.enum.js";
import type { ListCommerceProductsQueryDto } from "./dto/list-commerce-products-query.dto.js";
import { isRevenueEligibleOrderStatus } from "./order-revenue.js";
import type {
  CommerceProductListItemResponse,
  CommerceProductListResponse,
} from "./types/commerce-product-list-response.type.js";
import type {
  CommerceProductDetail,
  CommerceProductDetailResponse,
  CommerceProductInsight,
  CommerceProductRecentSale,
} from "./types/commerce-product-detail-response.type.js";

interface CommerceProductsPrismaClient {
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
    findFirst(args: {
      readonly where: CommerceProductDetailWhereInput;
      readonly select: CommerceProductDetailSelect;
    }): Promise<CommerceProductDetailRecord | null>;
  };
  readonly commerceOrderItem: {
    findMany(args: {
      readonly where: CommerceOrderItemWhereInput;
      readonly select: CommerceOrderItemSelect | CommerceOrderItemDetailSelect;
    }): Promise<readonly CommerceOrderItemRecord[]>;
  };
}

interface CommerceProductDetailWhereInput {
  readonly id: string;
  readonly businessId: string;
  readonly connectedStore: ActiveConnectedStoreWhereInput;
}

interface CommerceProductWhereInput {
  readonly businessId: string;
  readonly connectedStore: ActiveConnectedStoreWhereInput;
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
  readonly connectedStore: ActiveConnectedStoreWhereInput;
  readonly platform?: StorePlatform;
  readonly platformProductId?: { readonly in: readonly string[] };
  readonly OR?: readonly {
    readonly name?: { readonly contains: string; readonly mode: "insensitive" };
    readonly sku?: { readonly contains: string; readonly mode: "insensitive" };
    readonly platformProductId?: { readonly contains: string; readonly mode: "insensitive" };
  }[];
}

interface ActiveConnectedStoreWhereInput {
  readonly connectionStatus: StoreConnectionStatus.Connected;
  readonly disconnectedAt: null;
}

interface CommerceProductSelect {
  readonly id: true;
  readonly platform: true;
  readonly platformProductId: true;
  readonly sku: true;
  readonly name: true;
  readonly currency: true;
  readonly priceAmount: true;
  readonly stockStatus: true;
  readonly currentStockQuantity: true;
  readonly sourceMetadata: true;
  readonly connectedStore: {
    readonly select: { readonly id: true; readonly storeName: true; readonly storeUrl: true };
  };
}

interface CommerceProductDetailSelect extends CommerceProductSelect {
  readonly productStatus: true;
  readonly productType: true;
  readonly regularPriceAmount: true;
  readonly salePriceAmount: true;
  readonly platformCreatedAt: true;
  readonly platformUpdatedAt: true;
  readonly importedAt: true;
  readonly lastSyncedAt: true;
}

interface CommerceOrderItemSelect {
  readonly connectedStoreId: true;
  readonly connectedStore?: {
    readonly select: { readonly id: true; readonly storeName: true; readonly storeUrl: true };
  };
  readonly platform: true;
  readonly platformOrderItemId?: true;
  readonly platformProductId: true;
  readonly order?: {
    readonly select: { readonly orderStatus: true; readonly platformOrderId: true };
  };
  readonly sku?: true;
  readonly name?: true;
  readonly quantity: true;
  readonly unitPriceAmount?: true;
  readonly totalAmount: true;
}

interface CommerceOrderItemDetailSelect extends CommerceOrderItemSelect {
      readonly order: {
        readonly select: {
          readonly currency: true;
          readonly orderStatus: true;
          readonly orderedAt: true;
          readonly platformOrderId: true;
          readonly platformOrderNumber: true;
        };
      };
}

interface CommerceProductRecord {
  readonly id: string;
  readonly platform: StorePlatform;
  readonly platformProductId: string;
  readonly sku: string | null;
  readonly name: string | null;
  readonly currency: string | null;
  readonly priceAmount: unknown;
  readonly stockStatus: string | null;
  readonly currentStockQuantity: number | null;
  readonly sourceMetadata: unknown;
  readonly connectedStore: {
    readonly id: string;
    readonly storeName: string;
    readonly storeUrl: string | null;
  };
}

interface CommerceProductDetailRecord extends CommerceProductRecord {
  readonly productStatus: string | null;
  readonly productType: string | null;
  readonly regularPriceAmount: unknown;
  readonly salePriceAmount: unknown;
  readonly platformCreatedAt: Date | string | null;
  readonly platformUpdatedAt: Date | string | null;
  readonly importedAt: Date | string | null;
  readonly lastSyncedAt: Date | string | null;
}

interface CommerceOrderItemRecord {
  readonly connectedStoreId: string;
  readonly connectedStore?: {
    readonly id: string;
    readonly storeName: string;
    readonly storeUrl: string | null;
  };
  readonly platform: StorePlatform;
  readonly platformOrderItemId?: string | null;
  readonly platformProductId: string | null;
  readonly order?: { readonly orderStatus: string | null; readonly platformOrderId: string | null };
  readonly sku?: string | null;
  readonly name?: string | null;
  readonly quantity: number | null;
  readonly unitPriceAmount?: unknown;
  readonly totalAmount: unknown;
}

interface CommerceOrderItemDetailRecord extends Omit<CommerceOrderItemRecord, "order"> {
  readonly order: {
    readonly orderStatus: string | null;
    readonly currency?: string | null;
    readonly orderedAt: Date | string | null;
    readonly platformOrderId: string | null;
    readonly platformOrderNumber: string | null;
  };
}

interface ProductSalesSummary {
  readonly revenue: number;
  readonly unitsSold: number;
}

interface FallbackProductIdentity {
  readonly platform: StorePlatform;
  readonly productIdentity: string;
  readonly sourceStoreIdentity: string;
}

const productSelect = {
  id: true,
  platform: true,
  platformProductId: true,
  sku: true,
  name: true,
  currency: true,
  priceAmount: true,
  stockStatus: true,
  currentStockQuantity: true,
  sourceMetadata: true,
  connectedStore: { select: { id: true, storeName: true, storeUrl: true } },
} as const;

const productDetailSelect = {
  ...productSelect,
  productStatus: true,
  productType: true,
  regularPriceAmount: true,
  salePriceAmount: true,
  platformCreatedAt: true,
  platformUpdatedAt: true,
  importedAt: true,
  lastSyncedAt: true,
} as const;

@Injectable()
export class CommerceProductsService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async listProducts(
    userId: string,
    query: ListCommerceProductsQueryDto,
  ): Promise<CommerceProductListResponse> {
    const prisma = this.prismaService.client as unknown as CommerceProductsPrismaClient;
    const business = await prisma.business.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!business) {
      throw new UnauthorizedException(
        "Company profile is required before viewing commerce products.",
      );
    }

    const products = await prisma.commerceProduct.findMany({
      where: buildProductWhere(business.id, query),
      orderBy: { name: "asc" },
      take: 100,
      select: productSelect,
    });
    if (products.length === 0 && !query.stockStatus?.trim()) {
      const fallbackItems = await prisma.commerceOrderItem.findMany({
        where: buildOrderItemFallbackWhere(business.id, query),
        select: {
          connectedStoreId: true,
          connectedStore: { select: { id: true, storeName: true, storeUrl: true } },
          platform: true,
          platformOrderItemId: true,
          platformProductId: true,
          order: { select: { orderStatus: true, platformOrderId: true } },
          sku: true,
          name: true,
          quantity: true,
          unitPriceAmount: true,
          totalAmount: true,
        },
      });

      return {
        products: toFallbackProductListItems(fallbackItems).slice(0, 100),
      };
    }

    const productIds = [...new Set(products.map((product) => product.platformProductId))];
    const orderItems =
      productIds.length > 0
        ? await prisma.commerceOrderItem.findMany({
            where: {
              businessId: business.id,
              connectedStore: activeConnectedStoreWhere(),
              platformProductId: { in: productIds },
            },
            select: {
              connectedStoreId: true,
              connectedStore: { select: { id: true, storeName: true, storeUrl: true } },
              platform: true,
              platformOrderItemId: true,
              platformProductId: true,
              order: { select: { orderStatus: true, platformOrderId: true } },
              quantity: true,
              totalAmount: true,
            },
          })
        : [];
    const salesByProduct = summarizeSales(orderItems);

    return {
      products: products.map((product) => toProductListItem(product, salesByProduct)),
    };
  }

  async getProductDetail(userId: string, productId: string): Promise<CommerceProductDetailResponse> {
    const normalizedProductId = decodeProductId(productId);
    const prisma = this.prismaService.client as unknown as CommerceProductsPrismaClient;
    const business = await prisma.business.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!business) {
      throw new UnauthorizedException(
        "Company profile is required before viewing commerce products.",
      );
    }

    const product = await prisma.commerceProduct.findFirst({
      where: {
        businessId: business.id,
        connectedStore: activeConnectedStoreWhere(),
        id: normalizedProductId,
      },
      select: productDetailSelect,
    });

    if (!product) {
      const fallbackProduct = await this.getFallbackProductDetail(
        prisma,
        business.id,
        normalizedProductId,
      );

      if (fallbackProduct) {
        return { product: fallbackProduct };
      }

      throw new NotFoundException("Product could not be found for this business.");
    }

    const orderItems = await prisma.commerceOrderItem.findMany({
      where: {
        businessId: business.id,
        connectedStore: activeConnectedStoreWhere(),
        platform: product.platform,
        platformProductId: { in: [product.platformProductId] },
      },
      select: {
        connectedStoreId: true,
        connectedStore: { select: { id: true, storeName: true, storeUrl: true } },
        platform: true,
        platformOrderItemId: true,
        platformProductId: true,
        order: {
          select: {
            currency: true,
            orderedAt: true,
            orderStatus: true,
            platformOrderId: true,
            platformOrderNumber: true,
          },
        },
        unitPriceAmount: true,
        quantity: true,
        totalAmount: true,
      },
    });

    return {
      product: toProductDetail(product, filterOrderItemsForProduct(product, orderItems)),
    };
  }

  private async getFallbackProductDetail(
    prisma: CommerceProductsPrismaClient,
    businessId: string,
    productId: string,
  ): Promise<CommerceProductDetail | null> {
    const identity = parseFallbackProductId(productId);

    if (!identity) {
      return null;
    }

    const orderItems = await prisma.commerceOrderItem.findMany({
      where: {
        businessId,
        connectedStore: activeConnectedStoreWhere(),
        platform: identity.platform,
      },
      select: {
        connectedStoreId: true,
        connectedStore: { select: { id: true, storeName: true, storeUrl: true } },
        platform: true,
        platformOrderItemId: true,
        platformProductId: true,
        order: {
          select: {
            currency: true,
            orderedAt: true,
            orderStatus: true,
            platformOrderId: true,
            platformOrderNumber: true,
          },
        },
        sku: true,
        name: true,
        quantity: true,
        unitPriceAmount: true,
        totalAmount: true,
      },
    });
    const matchingItems = orderItems.filter(
      (item): item is CommerceOrderItemDetailRecord =>
        item.order !== undefined &&
        getFallbackProductIdentity(item) === identity.productIdentity &&
        toSourceStoreIdentity(item) === identity.sourceStoreIdentity,
    );

    if (matchingItems.length === 0) {
      return null;
    }

    return toFallbackProductDetail(productId, identity, matchingItems);
  }
}

function buildProductWhere(
  businessId: string,
  query: ListCommerceProductsQueryDto,
): CommerceProductWhereInput {
  return {
    businessId,
    connectedStore: activeConnectedStoreWhere(),
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

function buildOrderItemFallbackWhere(
  businessId: string,
  query: ListCommerceProductsQueryDto,
): CommerceOrderItemWhereInput {
  return {
    businessId,
    connectedStore: activeConnectedStoreWhere(),
    ...(query.platform ? { platform: query.platform } : {}),
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

function toProductListItem(
  product: CommerceProductRecord,
  salesByProduct: ReadonlyMap<string, ProductSalesSummary>,
): CommerceProductListItemResponse {
  const sales =
    salesByProduct.get(toProductSalesKey(product)) ??
    salesByProduct.get(toProductStoreIdSalesKey(product)) ??
    { revenue: 0, unitsSold: 0 };

  return {
    category: extractCategory(product.sourceMetadata),
    currency: product.currency,
    currentStock: product.currentStockQuantity,
    platform: product.platform,
    platformProductId: product.platformProductId,
    price: toNumberOrNull(product.priceAmount),
    productId: product.id,
    productName: product.name,
    revenue: sales.revenue,
    sku: product.sku,
    stockStatus: product.stockStatus,
    storeName: product.connectedStore.storeName,
    unitsSold: sales.unitsSold,
  };
}

function toFallbackProductListItems(
  orderItems: readonly CommerceOrderItemRecord[],
): readonly CommerceProductListItemResponse[] {
  const products = new Map<string, CommerceProductListItemResponse>();
  const seenSourceLineItems = new Set<string>();

  orderItems.forEach((item) => {
    if (!isRevenueEligibleOrderStatus(item.order?.orderStatus)) {
      return;
    }

    const sourceLineItemKey = toSourceLineItemKey(item);

    if (sourceLineItemKey && seenSourceLineItems.has(sourceLineItemKey)) {
      return;
    }

    const productIdentity = item.platformProductId ?? item.sku ?? item.name;

    if (!productIdentity) {
      return;
    }

    if (sourceLineItemKey) {
      seenSourceLineItems.add(sourceLineItemKey);
    }

    const key = toSalesKey({
      sourceStoreIdentity: toSourceStoreIdentity(item),
      platform: item.platform,
      platformProductId: productIdentity,
    });
    const current = products.get(key);
    const revenue = roundMoney((current?.revenue ?? 0) + (toNumberOrNull(item.totalAmount) ?? 0));
    const unitsSold = (current?.unitsSold ?? 0) + Math.max(item.quantity ?? 0, 0);

    products.set(key, {
      category: null,
      currency: null,
      currentStock: null,
      platform: item.platform,
      platformProductId: productIdentity,
      price: toNumberOrNull(item.unitPriceAmount),
      productId: `order-item:${key}`,
      productName: item.name ?? productIdentity,
      revenue,
      sku: item.sku ?? null,
      stockStatus: "Unknown",
      storeName: item.connectedStore?.storeName ?? "Connected store",
      unitsSold,
    });
  });

  return [...products.values()].sort(
    (first, second) =>
      second.revenue - first.revenue ||
      (first.productName ?? "").localeCompare(second.productName ?? ""),
  );
}

function summarizeSales(
  orderItems: readonly CommerceOrderItemRecord[],
): ReadonlyMap<string, ProductSalesSummary> {
  const totals = new Map<string, ProductSalesSummary>();
  const seenSourceLineItems = new Set<string>();

  orderItems.forEach((item) => {
    if (!item.platformProductId) {
      return;
    }

    if (!isRevenueEligibleOrderStatus(item.order?.orderStatus)) {
      return;
    }

    const sourceLineItemKey = toSourceLineItemKey(item);

    if (sourceLineItemKey && seenSourceLineItems.has(sourceLineItemKey)) {
      return;
    }

    if (sourceLineItemKey) {
      seenSourceLineItems.add(sourceLineItemKey);
    }

    const key = toSalesKey({
      sourceStoreIdentity: toSourceStoreIdentity(item),
      platform: item.platform,
      platformProductId: item.platformProductId,
    });
    const current = totals.get(key) ?? { revenue: 0, unitsSold: 0 };

    totals.set(key, {
      revenue: roundMoney(current.revenue + (toNumberOrNull(item.totalAmount) ?? 0)),
      unitsSold: current.unitsSold + Math.max(item.quantity ?? 0, 0),
    });
  });

  return totals;
}

function filterOrderItemsForProduct(
  product: CommerceProductRecord,
  orderItems: readonly CommerceOrderItemRecord[],
): readonly CommerceOrderItemDetailRecord[] {
  const productSalesKey = toProductSalesKey(product);

  return orderItems.filter(
    (item): item is CommerceOrderItemDetailRecord => {
      if (!item.order || item.platformProductId !== product.platformProductId) {
        return false;
      }

      return (
        toSalesKey({
          sourceStoreIdentity: toSourceStoreIdentity(item),
          platform: item.platform,
          platformProductId: product.platformProductId,
        }) === productSalesKey || item.connectedStoreId === product.connectedStore.id
      );
    },
  );
}

function toProductDetail(
  product: CommerceProductDetailRecord,
  orderItems: readonly CommerceOrderItemDetailRecord[],
): CommerceProductDetail {
  const sales = summarizeProductDetailSales(orderItems);

  return {
    category: extractCategory(product.sourceMetadata),
    currency: product.currency,
    currentStock: product.currentStockQuantity,
    importedAt: toIsoDate(product.importedAt),
    insights: buildProductInsights(product, sales),
    lastSyncedAt: toIsoDate(product.lastSyncedAt),
    platform: product.platform,
    platformCreatedAt: toIsoDate(product.platformCreatedAt),
    platformProductId: product.platformProductId,
    platformUpdatedAt: toIsoDate(product.platformUpdatedAt),
    price: toNumberOrNull(product.priceAmount),
    productId: product.id,
    productName: product.name,
    productStatus: product.productStatus,
    productType: product.productType,
    recentSales: toRecentSales(orderItems),
    regularPrice: toNumberOrNull(product.regularPriceAmount),
    salePrice: toNumberOrNull(product.salePriceAmount),
    sales,
    sku: product.sku,
    stockStatus: product.stockStatus,
    store: {
      connectedStoreId: product.connectedStore.id,
      storeName: product.connectedStore.storeName,
      storeUrl: product.connectedStore.storeUrl,
    },
  };
}

function toFallbackProductDetail(
  productId: string,
  identity: FallbackProductIdentity,
  orderItems: readonly CommerceOrderItemDetailRecord[],
): CommerceProductDetail {
  const firstItem = orderItems[0];
  const sales = summarizeProductDetailSales(orderItems);
  const productName = firstItem?.name ?? identity.productIdentity;
  const platformProductId = firstItem?.platformProductId ?? identity.productIdentity;

  return {
    category: null,
    currency: firstItem?.order.currency ?? null,
    currentStock: null,
    importedAt: null,
    insights: buildFallbackProductInsights(productName, sales),
    lastSyncedAt: null,
    platform: identity.platform,
    platformCreatedAt: null,
    platformProductId,
    platformUpdatedAt: null,
    price: toNumberOrNull(firstItem?.unitPriceAmount),
    productId,
    productName,
    productStatus: null,
    productType: null,
    recentSales: toRecentSales(orderItems),
    regularPrice: null,
    salePrice: null,
    sales,
    sku: firstItem?.sku ?? null,
    stockStatus: null,
    store: {
      connectedStoreId: firstItem?.connectedStore?.id ?? firstItem?.connectedStoreId ?? "unknown-store",
      storeName: firstItem?.connectedStore?.storeName ?? "Connected store",
      storeUrl: firstItem?.connectedStore?.storeUrl ?? null,
    },
  };
}

function summarizeProductDetailSales(
  orderItems: readonly CommerceOrderItemDetailRecord[],
): CommerceProductDetail["sales"] {
  const seenSourceLineItems = new Set<string>();
  const seenOrders = new Set<string>();
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  let totalRevenue = 0;
  let totalUnitsSold = 0;
  let last30DaysRevenue = 0;
  let last30DaysUnitsSold = 0;
  let lastPurchaseDate: string | null = null;

  orderItems.forEach((item) => {
    if (!isRevenueEligibleOrderStatus(item.order.orderStatus)) {
      return;
    }

    const sourceLineItemKey = toSourceLineItemKey(item);

    if (sourceLineItemKey && seenSourceLineItems.has(sourceLineItemKey)) {
      return;
    }

    if (sourceLineItemKey) {
      seenSourceLineItems.add(sourceLineItemKey);
    }

    const orderedAt = toDate(item.order.orderedAt);
    const revenue = toNumberOrNull(item.totalAmount) ?? 0;
    const quantity = Math.max(item.quantity ?? 0, 0);

    totalRevenue = roundMoney(totalRevenue + revenue);
    totalUnitsSold += quantity;

    if (orderedAt && orderedAt.getTime() >= thirtyDaysAgo) {
      last30DaysRevenue = roundMoney(last30DaysRevenue + revenue);
      last30DaysUnitsSold += quantity;
    }

    if (item.order.platformOrderId) {
      seenOrders.add(item.order.platformOrderId);
    }

    if (orderedAt && (!lastPurchaseDate || orderedAt.getTime() > Date.parse(lastPurchaseDate))) {
      lastPurchaseDate = orderedAt.toISOString();
    }
  });

  return {
    averageOrderValue: seenOrders.size > 0 ? roundMoney(totalRevenue / seenOrders.size) : 0,
    last30DaysRevenue,
    last30DaysUnitsSold,
    lastPurchaseDate,
    salesRatePerDay: roundMoney(last30DaysUnitsSold / 30),
    totalOrders: seenOrders.size,
    totalRevenue,
    totalUnitsSold,
  };
}

function toRecentSales(
  orderItems: readonly CommerceOrderItemDetailRecord[],
): readonly CommerceProductRecentSale[] {
  const seenSourceLineItems = new Set<string>();

  return orderItems
    .filter((item) => {
      if (!isRevenueEligibleOrderStatus(item.order.orderStatus)) {
        return false;
      }

      const sourceLineItemKey = toSourceLineItemKey(item);

      if (sourceLineItemKey && seenSourceLineItems.has(sourceLineItemKey)) {
        return false;
      }

      if (sourceLineItemKey) {
        seenSourceLineItems.add(sourceLineItemKey);
      }

      return true;
    })
    .sort((first, second) => {
      const firstTime = toDate(first.order.orderedAt)?.getTime() ?? 0;
      const secondTime = toDate(second.order.orderedAt)?.getTime() ?? 0;

      return secondTime - firstTime;
    })
    .slice(0, 8)
    .map((item) => ({
      date: toIsoDate(item.order.orderedAt),
      orderNumber: item.order.platformOrderNumber ?? item.order.platformOrderId,
      quantity: Math.max(item.quantity ?? 0, 0),
      revenue: toNumberOrNull(item.totalAmount) ?? 0,
      status: item.order.orderStatus,
    }));
}

function buildProductInsights(
  product: CommerceProductDetailRecord,
  sales: CommerceProductDetail["sales"],
): readonly CommerceProductInsight[] {
  const insights: CommerceProductInsight[] = [];
  const displayName = product.name ?? "This product";

  if (sales.salesRatePerDay > 0) {
    insights.push({
      severity: "SUCCESS",
      title: "Sales rate is available",
      message: `${displayName} is selling at ${sales.salesRatePerDay} units per day based on the last 30 days of revenue-eligible orders.`,
    });
  } else {
    insights.push({
      severity: "INFO",
      title: "No recent sales rate yet",
      message: "No revenue-eligible sales were found for this product in the last 30 days.",
    });
  }

  if (product.currentStockQuantity === null) {
    insights.push({
      severity: "INFO",
      title: "Stock quantity is not captured",
      message:
        "The connected store has not provided a numeric stock quantity for this product, so inventory risk is limited to the reported stock status.",
    });
  } else if (product.currentStockQuantity <= 5) {
    insights.push({
      severity: "WARNING",
      title: "Stock requires attention",
      message: `${displayName} has ${product.currentStockQuantity} units on hand. Review replenishment before demand increases.`,
    });
  }

  if (sales.totalOrders > 0 && sales.averageOrderValue > 0) {
    insights.push({
      severity: "INFO",
      title: "Average order value is traceable",
      message: `Revenue-eligible orders containing this product average ${sales.averageOrderValue.toFixed(2)} in order-line value.`,
    });
  }

  return insights.slice(0, 4);
}

function buildFallbackProductInsights(
  productName: string,
  sales: CommerceProductDetail["sales"],
): readonly CommerceProductInsight[] {
  const insights: CommerceProductInsight[] = [];

  if (sales.salesRatePerDay > 0) {
    insights.push({
      severity: "SUCCESS",
      title: "Sales rate is available",
      message: `${productName} is selling at ${sales.salesRatePerDay} units per day based on the last 30 days of revenue-eligible orders.`,
    });
  } else {
    insights.push({
      severity: "INFO",
      title: "No recent sales rate yet",
      message: "No revenue-eligible sales were found for this product in the last 30 days.",
    });
  }

  insights.push({
    severity: "INFO",
    title: "Product record inferred from sales",
    message:
      "This detail view is built from normalized order line items because the store did not provide a separate product record for this item.",
  });

  return insights;
}

function parseFallbackProductId(productId: string): FallbackProductIdentity | null {
  const decodedProductId = decodeProductId(productId);
  const prefix = "order-item:";

  if (!decodedProductId.startsWith(prefix)) {
    return null;
  }

  const value = decodedProductId.slice(prefix.length);

  for (const platform of Object.values(StorePlatform)) {
    const marker = `:${platform}:`;
    const markerIndex = value.lastIndexOf(marker);

    if (markerIndex === -1) {
      continue;
    }

    const sourceStoreIdentity = value.slice(0, markerIndex);
    const productIdentity = value.slice(markerIndex + marker.length);

    if (sourceStoreIdentity && productIdentity) {
      return { platform, productIdentity, sourceStoreIdentity };
    }
  }

  return null;
}

function decodeProductId(productId: string): string {
  try {
    return decodeURIComponent(productId);
  } catch {
    return productId;
  }
}

function getFallbackProductIdentity(item: CommerceOrderItemRecord): string | null {
  return item.platformProductId ?? item.sku ?? item.name ?? null;
}

function toProductSalesKey(product: CommerceProductRecord): string {
  return toSalesKey({
    sourceStoreIdentity: toSourceStoreIdentity(product),
    platform: product.platform,
    platformProductId: product.platformProductId,
  });
}

function toProductStoreIdSalesKey(product: CommerceProductRecord): string {
  return toSalesKey({
    sourceStoreIdentity: product.connectedStore.id,
    platform: product.platform,
    platformProductId: product.platformProductId,
  });
}

function toSalesKey(input: {
  readonly sourceStoreIdentity: string;
  readonly platform: StorePlatform;
  readonly platformProductId: string;
}): string {
  return `${input.sourceStoreIdentity}:${input.platform}:${input.platformProductId}`;
}

function activeConnectedStoreWhere(): ActiveConnectedStoreWhereInput {
  return {
    connectionStatus: StoreConnectionStatus.Connected,
    disconnectedAt: null,
  };
}

function toSourceStoreIdentity(input: {
  readonly connectedStoreId?: string;
  readonly connectedStore?: { readonly id?: string; readonly storeUrl: string | null };
}): string {
  return (
    normalizeStoreUrl(input.connectedStore?.storeUrl) ??
    input.connectedStore?.id ??
    input.connectedStoreId ??
    "unknown-store"
  );
}

function normalizeStoreUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    const parsed = new URL(value.trim());
    return `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/$/, "")}`.toLowerCase();
  } catch {
    return value.trim().replace(/\/$/, "").toLowerCase();
  }
}

function toSourceLineItemKey(item: CommerceOrderItemRecord): string | null {
  const sourceOrderId = item.order?.platformOrderId;

  if (!sourceOrderId || !item.platformOrderItemId) {
    return null;
  }

  const sourceStoreIdentity =
    normalizeStoreUrl(item.connectedStore?.storeUrl) ?? item.connectedStoreId;

  return `${item.platform}:${sourceStoreIdentity}:${sourceOrderId}:${item.platformOrderItemId}`;
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

function toIsoDate(value: Date | string | null): string | null {
  return toDate(value)?.toISOString() ?? null;
}

function toDate(value: Date | string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
