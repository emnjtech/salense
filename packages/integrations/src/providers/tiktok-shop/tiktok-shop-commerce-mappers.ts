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
  TikTokShopRawInventory,
  TikTokShopRawOrder,
  TikTokShopRawOrderLineItem,
  TikTokShopRawProduct,
  TikTokShopRawRefund,
} from "./tiktok-shop-raw-models.js";

export interface TikTokShopCommerceMappingContext {
  readonly businessId: string;
  readonly connectedStoreId: string;
  readonly importedAt?: Date;
  readonly lastSyncedAt?: Date;
}

export interface NormalizedTikTokShopOrderTree {
  readonly order: NormalizedCommerceOrder;
  readonly items: readonly NormalizedCommerceOrderItem[];
  readonly refunds: readonly NormalizedCommerceRefund[];
}

export function mapTikTokShopOrder(
  rawOrder: TikTokShopRawOrder,
  context: TikTokShopCommerceMappingContext,
): NormalizedTikTokShopOrderTree {
  return {
    items: (rawOrder.line_items ?? []).map((item) =>
      mapTikTokShopOrderItem(item, { ...context, platformOrderId: rawOrder.id }),
    ),
    order: {
      ...baseCommerceFields(context),
      currency: rawOrder.currency ?? rawOrder.payment?.total_amount?.currency,
      discountAmount: addMoneyAmounts(
        rawOrder.payment?.platform_discount?.amount,
        rawOrder.payment?.seller_discount?.amount,
      ),
      orderedAt: parseTikTokShopDate(rawOrder.paid_time ?? rawOrder.create_time),
      orderStatus: rawOrder.order_status,
      platformCreatedAt: parseTikTokShopDate(rawOrder.create_time),
      platformOrderId: rawOrder.id,
      platformOrderNumber: rawOrder.id,
      platformUpdatedAt: parseTikTokShopDate(rawOrder.update_time),
      refundedAmount: undefined,
      shippingAmount: moneyToString(rawOrder.payment?.original_shipping_fee?.amount),
      sourceMetadata: createSourceMetadata(rawOrder),
      subtotalAmount: moneyToString(rawOrder.payment?.sub_total?.amount),
      taxAmount: moneyToString(rawOrder.payment?.tax?.amount),
      totalAmount: moneyToString(rawOrder.payment?.total_amount?.amount),
    },
    refunds: [],
  };
}

export function mapTikTokShopOrderItem(
  rawItem: TikTokShopRawOrderLineItem,
  context: TikTokShopCommerceMappingContext & { readonly platformOrderId: string },
): NormalizedCommerceOrderItem {
  return {
    ...baseCommerceFields(context),
    name: rawItem.product_name ?? rawItem.sku_name,
    platformOrderId: context.platformOrderId,
    platformOrderItemId: rawItem.id,
    platformProductId: rawItem.product_id,
    platformVariationId: rawItem.sku_id,
    quantity: rawItem.sku_quantity,
    sku: rawItem.seller_sku,
    sourceMetadata: createSourceMetadata(rawItem),
    subtotalAmount: moneyToString(rawItem.sale_price?.amount),
    taxAmount: undefined,
    totalAmount: moneyToString(rawItem.sale_price?.amount),
    unitPriceAmount: moneyToString(rawItem.sale_price?.amount),
  };
}

export function mapTikTokShopProduct(
  rawProduct: TikTokShopRawProduct,
  context: TikTokShopCommerceMappingContext & { readonly currency?: string },
): NormalizedCommerceProduct {
  const firstSku = rawProduct.skus?.[0];
  const totalStock = rawProduct.skus?.reduce(
    (sum, sku) =>
      sum +
      (sku.inventory?.reduce((inventorySum, inventory) => inventorySum + (inventory.quantity ?? 0), 0) ?? 0),
    0,
  );

  return {
    ...baseCommerceFields(context),
    currency: firstSku?.price?.currency ?? context.currency,
    currentStockQuantity: totalStock,
    name: rawProduct.title,
    platformCreatedAt: parseTikTokShopDate(rawProduct.create_time),
    platformProductId: rawProduct.id,
    platformUpdatedAt: parseTikTokShopDate(rawProduct.update_time),
    platformVariationId: firstSku?.id,
    priceAmount: moneyToString(firstSku?.price?.amount),
    productStatus: rawProduct.status,
    productType: rawProduct.category_chains?.at(-1)?.local_name,
    regularPriceAmount: moneyToString(firstSku?.price?.amount),
    salePriceAmount: undefined,
    sku: firstSku?.seller_sku,
    sourceMetadata: createSourceMetadata(rawProduct),
    stockStatus: toStockStatus(totalStock),
  };
}

export function mapTikTokShopCustomer(
  rawOrder: TikTokShopRawOrder,
  context: TikTokShopCommerceMappingContext,
): NormalizedCommerceCustomer | null {
  const nameParts = splitCustomerName(rawOrder.recipient_address?.name);
  const customerId = rawOrder.buyer_uid ?? rawOrder.buyer_email ?? `tiktok-order-buyer:${rawOrder.id}`;

  return {
    ...baseCommerceFields(context),
    customerRole: "buyer",
    email: rawOrder.buyer_email,
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    platformCreatedAt: parseTikTokShopDate(rawOrder.create_time),
    platformCustomerId: customerId,
    platformUpdatedAt: parseTikTokShopDate(rawOrder.update_time),
    sourceMetadata: createSourceMetadata(rawOrder),
    username: undefined,
  };
}

export function mapTikTokShopInventorySnapshot(
  rawInventory: TikTokShopRawInventory,
  context: TikTokShopCommerceMappingContext & { readonly capturedAt?: Date },
): NormalizedCommerceInventorySnapshot {
  return {
    ...baseCommerceFields(context),
    capturedAt: context.capturedAt ?? context.lastSyncedAt ?? context.importedAt ?? new Date(),
    manageStock: true,
    platformProductId: rawInventory.product_id,
    sku: rawInventory.seller_sku,
    sourceMetadata: createSourceMetadata(rawInventory),
    stockQuantity: rawInventory.quantity,
    stockStatus: toStockStatus(rawInventory.quantity),
  };
}

export function mapTikTokShopRefund(
  rawRefund: TikTokShopRawRefund,
  context: TikTokShopCommerceMappingContext,
): NormalizedCommerceRefund {
  return {
    ...baseCommerceFields(context),
    amount: moneyToString(rawRefund.refund_amount?.amount),
    currency: rawRefund.refund_amount?.currency ?? rawRefund.currency,
    platformOrderId: rawRefund.order_id,
    platformRefundId: rawRefund.id,
    reason: rawRefund.reason,
    refundedAt: parseTikTokShopDate(rawRefund.update_time ?? rawRefund.create_time),
    refundStatus: rawRefund.refund_status,
    sourceMetadata: createSourceMetadata(rawRefund),
  };
}

export function mapTikTokShopCategories(
  rawProducts: readonly TikTokShopRawProduct[],
  context: TikTokShopCommerceMappingContext,
): readonly NormalizedCommerceCategory[] {
  const categories = new Map<string, { readonly count: number; readonly name?: string; readonly parentId?: string }>();

  for (const product of rawProducts) {
    for (const category of product.category_chains ?? []) {
      if (!category.id) {
        continue;
      }

      const current = categories.get(category.id);
      const name = category.local_name ?? current?.name;
      const parentId = category.parent_id ?? current?.parentId;
      categories.set(category.id, {
        count: (current?.count ?? 0) + (category.is_leaf ? 1 : 0),
        ...(name ? { name } : {}),
        ...(parentId ? { parentId } : {}),
      });
    }
  }

  return [...categories.entries()].map(([categoryId, category]) => ({
    ...baseCommerceFields(context),
    name: category.name,
    platformCategoryId: categoryId,
    platformParentCategoryId: category.parentId,
    productCount: category.count,
    slug: category.name?.toLowerCase().replaceAll(/\s+/gu, "-"),
    sourceMetadata: createSourceMetadata({ categoryId, ...category }),
  }));
}

function baseCommerceFields(context: TikTokShopCommerceMappingContext): {
  readonly businessId: string;
  readonly connectedStoreId: string;
  readonly importedAt: Date;
  readonly lastSyncedAt: Date;
  readonly platform: IntegrationPlatform.TikTokShop;
} {
  const now = new Date();

  return {
    businessId: context.businessId,
    connectedStoreId: context.connectedStoreId,
    importedAt: context.importedAt ?? now,
    lastSyncedAt: context.lastSyncedAt ?? context.importedAt ?? now,
    platform: IntegrationPlatform.TikTokShop,
  };
}

function createSourceMetadata<TRaw>(raw: TRaw): NormalizedSourceMetadata<TRaw> {
  return { raw, source: "tiktok_shop" };
}

function moneyToString(value: string | number | undefined): string | undefined {
  return value === undefined ? undefined : String(value);
}

function addMoneyAmounts(...values: readonly (string | number | undefined)[]): string | undefined {
  const numbers = values
    .map((value) => (value === undefined ? undefined : Number(value)))
    .filter((value): value is number => value !== undefined && Number.isFinite(value));

  return numbers.length === 0 ? undefined : numbers.reduce((sum, value) => sum + value, 0).toFixed(2);
}

function parseTikTokShopDate(value: number | string | undefined): Date | undefined {
  if (value === undefined) {
    return undefined;
  }

  const numericValue = typeof value === "number" ? value : Number(value);
  const date = Number.isFinite(numericValue)
    ? new Date(numericValue < 10_000_000_000 ? numericValue * 1000 : numericValue)
    : new Date(String(value));

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function splitCustomerName(value: string | undefined): { readonly firstName?: string; readonly lastName?: string } {
  const parts = value?.trim().split(/\s+/u).filter(Boolean) ?? [];

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
