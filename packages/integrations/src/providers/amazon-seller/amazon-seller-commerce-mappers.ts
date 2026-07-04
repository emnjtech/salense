import { IntegrationPlatform } from "../../types/integration-platform.js";
import type {
  NormalizedCommerceCategory,
  NormalizedCommerceCustomer,
  NormalizedCommerceInventorySnapshot,
  NormalizedCommerceOrder,
  NormalizedCommerceOrderItem,
  NormalizedCommerceProduct,
  NormalizedCommerceRefund,
  NormalizedSourceMetadata,
} from "../woocommerce/woocommerce-commerce-mappers.js";
import type {
  AmazonSellerRawCatalogItem,
  AmazonSellerRawInventorySummary,
  AmazonSellerRawOrder,
  AmazonSellerRawOrderItem,
  AmazonSellerRawRefundEvent,
} from "./amazon-seller-raw-models.js";

export interface AmazonSellerCommerceMappingContext {
  readonly businessId: string;
  readonly connectedStoreId: string;
  readonly importedAt?: Date;
  readonly lastSyncedAt?: Date;
}

export interface NormalizedAmazonSellerOrderTree {
  readonly order: NormalizedCommerceOrder;
  readonly items: readonly NormalizedCommerceOrderItem[];
  readonly refunds: readonly NormalizedCommerceRefund[];
}

export function mapAmazonSellerOrder(
  rawOrder: AmazonSellerRawOrder,
  rawItems: readonly AmazonSellerRawOrderItem[],
  context: AmazonSellerCommerceMappingContext,
): NormalizedAmazonSellerOrderTree {
  return {
    items: rawItems.map((item) =>
      mapAmazonSellerOrderItem(item, {
        ...context,
        platformOrderId: rawOrder.AmazonOrderId,
      }),
    ),
    order: {
      ...baseCommerceFields(context),
      currency: rawOrder.OrderTotal?.CurrencyCode,
      discountAmount: undefined,
      orderedAt: parseAmazonSellerDate(rawOrder.PurchaseDate),
      orderStatus: rawOrder.OrderStatus,
      platformCreatedAt: parseAmazonSellerDate(rawOrder.PurchaseDate),
      platformOrderId: rawOrder.AmazonOrderId,
      platformOrderNumber: rawOrder.AmazonOrderId,
      platformUpdatedAt: parseAmazonSellerDate(rawOrder.LastUpdateDate),
      refundedAmount: undefined,
      shippingAmount: undefined,
      sourceMetadata: createSourceMetadata(rawOrder),
      subtotalAmount: moneyToString(rawOrder.OrderTotal?.Amount),
      taxAmount: undefined,
      totalAmount: moneyToString(rawOrder.OrderTotal?.Amount),
    },
    refunds: [],
  };
}

export function mapAmazonSellerOrderItem(
  rawItem: AmazonSellerRawOrderItem,
  context: AmazonSellerCommerceMappingContext & {
    readonly platformOrderId: string;
  },
): NormalizedCommerceOrderItem {
  return {
    ...baseCommerceFields(context),
    name: rawItem.Title,
    platformOrderId: context.platformOrderId,
    platformOrderItemId: rawItem.OrderItemId,
    platformProductId: rawItem.ASIN,
    platformVariationId: undefined,
    quantity: rawItem.QuantityOrdered ?? rawItem.ProductInfo?.NumberOfItems,
    sku: rawItem.SellerSKU,
    sourceMetadata: createSourceMetadata(rawItem),
    subtotalAmount: moneyToString(rawItem.ItemPrice?.Amount),
    taxAmount: moneyToString(rawItem.ItemTax?.Amount),
    totalAmount: moneyToString(rawItem.ItemPrice?.Amount),
    unitPriceAmount: moneyToString(rawItem.ItemPrice?.Amount),
  };
}

export function mapAmazonSellerProduct(
  rawProduct: AmazonSellerRawCatalogItem,
  context: AmazonSellerCommerceMappingContext & { readonly currency?: string },
): NormalizedCommerceProduct {
  return {
    ...baseCommerceFields(context),
    currency: context.currency,
    currentStockQuantity: undefined,
    name: rawProduct.summaries?.[0]?.itemName,
    platformCreatedAt: undefined,
    platformProductId: rawProduct.asin,
    platformUpdatedAt: undefined,
    platformVariationId: undefined,
    priceAmount: undefined,
    productStatus: undefined,
    productType: rawProduct.productTypes?.[0]?.productType,
    regularPriceAmount: undefined,
    salePriceAmount: undefined,
    sku: undefined,
    sourceMetadata: createSourceMetadata(rawProduct),
    stockStatus: undefined,
  };
}

export function mapAmazonSellerCustomer(
  rawOrder: AmazonSellerRawOrder,
  context: AmazonSellerCommerceMappingContext,
): NormalizedCommerceCustomer | null {
  const email = rawOrder.BuyerInfo?.BuyerEmail;
  const buyerName = splitBuyerName(rawOrder.BuyerInfo?.BuyerName);

  if (!email && !rawOrder.AmazonOrderId) {
    return null;
  }

  return {
    ...baseCommerceFields(context),
    customerRole: "buyer",
    email,
    firstName: buyerName.firstName,
    lastName: buyerName.lastName,
    platformCreatedAt: parseAmazonSellerDate(rawOrder.PurchaseDate),
    platformCustomerId: email ?? `amazon-order-buyer:${rawOrder.AmazonOrderId}`,
    platformUpdatedAt: parseAmazonSellerDate(rawOrder.LastUpdateDate),
    sourceMetadata: createSourceMetadata(rawOrder),
    username: undefined,
  };
}

export function mapAmazonSellerInventorySnapshot(
  rawInventory: AmazonSellerRawInventorySummary,
  context: AmazonSellerCommerceMappingContext & { readonly capturedAt?: Date },
): NormalizedCommerceInventorySnapshot {
  const stockQuantity = rawInventory.totalQuantity ?? rawInventory.inventoryDetails?.fulfillableQuantity;

  return {
    ...baseCommerceFields(context),
    capturedAt: context.capturedAt ?? context.lastSyncedAt ?? context.importedAt ?? new Date(),
    manageStock: true,
    platformProductId: rawInventory.asin ?? rawInventory.sellerSku,
    sku: rawInventory.sellerSku,
    sourceMetadata: createSourceMetadata(rawInventory),
    stockQuantity,
    stockStatus: toStockStatus(stockQuantity),
  };
}

export function mapAmazonSellerRefund(
  rawRefund: AmazonSellerRawRefundEvent,
  context: AmazonSellerCommerceMappingContext,
): NormalizedCommerceRefund {
  return {
    ...baseCommerceFields(context),
    amount: sumRefundEvent(rawRefund),
    currency: firstRefundCurrency(rawRefund),
    platformOrderId: rawRefund.AmazonOrderId ?? rawRefund.SellerOrderId,
    platformRefundId: [
      rawRefund.AmazonOrderId ?? rawRefund.SellerOrderId ?? "unknown-order",
      rawRefund.PostedDate ?? "unknown-date",
    ].join(":"),
    reason: "Amazon Seller refund event",
    refundedAt: parseAmazonSellerDate(rawRefund.PostedDate),
    refundStatus: "completed",
    sourceMetadata: createSourceMetadata(rawRefund),
  };
}

export function mapAmazonSellerCategories(
  rawProducts: readonly AmazonSellerRawCatalogItem[],
  context: AmazonSellerCommerceMappingContext,
): readonly NormalizedCommerceCategory[] {
  const productTypeCounts = new Map<string, number>();

  for (const product of rawProducts) {
    const productType = product.productTypes?.[0]?.productType;
    if (productType) {
      productTypeCounts.set(productType, (productTypeCounts.get(productType) ?? 0) + 1);
    }
  }

  return [...productTypeCounts.entries()].map(([productType, count]) => ({
    ...baseCommerceFields(context),
    name: productType,
    platformCategoryId: productType,
    platformParentCategoryId: undefined,
    productCount: count,
    slug: productType.toLowerCase(),
    sourceMetadata: createSourceMetadata({ productType, source: "amazon_product_type" }),
  }));
}

function baseCommerceFields(context: AmazonSellerCommerceMappingContext): {
  readonly businessId: string;
  readonly connectedStoreId: string;
  readonly importedAt: Date;
  readonly lastSyncedAt: Date;
  readonly platform: IntegrationPlatform.AmazonSeller;
} {
  const now = new Date();

  return {
    businessId: context.businessId,
    connectedStoreId: context.connectedStoreId,
    importedAt: context.importedAt ?? now,
    lastSyncedAt: context.lastSyncedAt ?? context.importedAt ?? now,
    platform: IntegrationPlatform.AmazonSeller,
  };
}

function createSourceMetadata<TRaw>(raw: TRaw): NormalizedSourceMetadata<TRaw> {
  return {
    raw,
    source: "amazon_seller",
  };
}

function moneyToString(value: string | number | undefined): string | undefined {
  return value === undefined ? undefined : String(value);
}

function parseAmazonSellerDate(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function splitBuyerName(value: string | undefined): { readonly firstName?: string; readonly lastName?: string } {
  const parts = value?.trim().split(/\s+/u).filter(Boolean) ?? [];

  if (parts.length === 0) {
    return {};
  }

  return {
    ...(parts[0] ? { firstName: parts[0] } : {}),
    ...(parts.length > 1 ? { lastName: parts.slice(1).join(" ") } : {}),
  };
}

function toStockStatus(stockQuantity: number | undefined): string | undefined {
  if (stockQuantity === undefined) {
    return undefined;
  }

  return stockQuantity > 0 ? "instock" : "outofstock";
}

function sumRefundEvent(rawRefund: AmazonSellerRawRefundEvent): string | undefined {
  const amounts =
    rawRefund.ShipmentItemAdjustmentList?.flatMap(
      (item) =>
        item.ItemChargeAdjustmentList?.map((charge) =>
          charge.ChargeAmount?.Amount === undefined ? undefined : Number(charge.ChargeAmount.Amount),
        ) ?? [],
    ).filter((amount): amount is number => amount !== undefined && Number.isFinite(amount)) ?? [];

  if (amounts.length === 0) {
    return undefined;
  }

  return amounts.reduce((sum, amount) => sum + amount, 0).toFixed(2);
}

function firstRefundCurrency(rawRefund: AmazonSellerRawRefundEvent): string | undefined {
  return rawRefund.ShipmentItemAdjustmentList?.flatMap(
    (item) =>
      item.ItemChargeAdjustmentList?.map((charge) => charge.ChargeAmount?.CurrencyCode).filter(Boolean) ??
      [],
  )[0];
}
