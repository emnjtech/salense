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
  ShopifyRawCollection,
  ShopifyRawCustomer,
  ShopifyRawInventory,
  ShopifyRawLineItem,
  ShopifyRawOrder,
  ShopifyRawProduct,
  ShopifyRawRefund,
} from "./shopify-raw-models.js";

export interface ShopifyCommerceMappingContext {
  readonly businessId: string;
  readonly connectedStoreId: string;
  readonly importedAt?: Date;
  readonly lastSyncedAt?: Date;
}

export interface NormalizedShopifyOrderTree {
  readonly order: NormalizedCommerceOrder;
  readonly items: readonly NormalizedCommerceOrderItem[];
  readonly refunds: readonly NormalizedCommerceRefund[];
}

export function mapShopifyOrder(
  rawOrder: ShopifyRawOrder,
  context: ShopifyCommerceMappingContext,
): NormalizedShopifyOrderTree {
  const platformOrderId = String(rawOrder.id);

  return {
    items: (rawOrder.line_items ?? []).map((item) =>
      mapShopifyOrderItem(item, { ...context, platformOrderId }),
    ),
    order: {
      ...baseCommerceFields(context),
      currency: rawOrder.currency,
      discountAmount: rawOrder.current_total_discounts,
      orderedAt: parseShopifyDate(rawOrder.processed_at ?? rawOrder.created_at),
      orderStatus: rawOrder.fulfillment_status ?? rawOrder.financial_status,
      platformCreatedAt: parseShopifyDate(rawOrder.created_at),
      platformOrderId,
      platformOrderNumber: rawOrder.name ?? String(rawOrder.order_number ?? rawOrder.id),
      platformUpdatedAt: parseShopifyDate(rawOrder.updated_at),
      refundedAmount: undefined,
      shippingAmount: rawOrder.total_shipping_price_set?.shop_money?.amount,
      sourceMetadata: createSourceMetadata(rawOrder),
      subtotalAmount: rawOrder.current_subtotal_price,
      taxAmount: rawOrder.current_total_tax,
      totalAmount: rawOrder.current_total_price,
    },
    refunds: (rawOrder.refunds ?? []).map((refund) =>
      mapShopifyRefund({ ...refund, order_id: refund.order_id ?? rawOrder.id }, context),
    ),
  };
}

export function mapShopifyOrderItem(
  rawItem: ShopifyRawLineItem,
  context: ShopifyCommerceMappingContext & { readonly platformOrderId: string },
): NormalizedCommerceOrderItem {
  const unitPrice = rawItem.price_set?.shop_money?.amount ?? rawItem.price;

  return {
    ...baseCommerceFields(context),
    name: rawItem.title ?? rawItem.name,
    platformOrderId: context.platformOrderId,
    platformOrderItemId: String(rawItem.id),
    platformProductId: rawItem.product_id === undefined ? undefined : String(rawItem.product_id),
    platformVariationId: rawItem.variant_id === undefined ? undefined : String(rawItem.variant_id),
    quantity: rawItem.quantity,
    sku: rawItem.sku,
    sourceMetadata: createSourceMetadata(rawItem),
    subtotalAmount: unitPrice === undefined || rawItem.quantity === undefined
      ? unitPrice
      : (Number(unitPrice) * rawItem.quantity).toFixed(2),
    taxAmount: undefined,
    totalAmount: unitPrice === undefined || rawItem.quantity === undefined
      ? unitPrice
      : (Number(unitPrice) * rawItem.quantity).toFixed(2),
    unitPriceAmount: unitPrice,
  };
}

export function mapShopifyProduct(
  rawProduct: ShopifyRawProduct,
  context: ShopifyCommerceMappingContext & { readonly currency?: string },
): NormalizedCommerceProduct {
  const firstVariant = rawProduct.variants?.[0];
  const totalStock = rawProduct.variants?.reduce(
    (sum, variant) => sum + (variant.inventory_quantity ?? 0),
    0,
  );

  return {
    ...baseCommerceFields(context),
    currency: context.currency,
    currentStockQuantity: totalStock,
    name: rawProduct.title,
    platformCreatedAt: parseShopifyDate(rawProduct.created_at),
    platformProductId: String(rawProduct.id),
    platformUpdatedAt: parseShopifyDate(rawProduct.updated_at),
    platformVariationId: firstVariant?.id === undefined ? undefined : String(firstVariant.id),
    priceAmount: firstVariant?.price,
    productStatus: rawProduct.status,
    productType: rawProduct.product_type,
    regularPriceAmount: firstVariant?.compare_at_price ?? firstVariant?.price,
    salePriceAmount: firstVariant?.compare_at_price ? firstVariant.price : undefined,
    sku: firstVariant?.sku,
    sourceMetadata: createSourceMetadata(rawProduct),
    stockStatus: toStockStatus(totalStock),
  };
}

export function mapShopifyCustomer(
  rawCustomer: ShopifyRawCustomer,
  context: ShopifyCommerceMappingContext,
): NormalizedCommerceCustomer {
  return {
    ...baseCommerceFields(context),
    customerRole: "customer",
    email: rawCustomer.email,
    firstName: rawCustomer.first_name,
    lastName: rawCustomer.last_name,
    platformCreatedAt: parseShopifyDate(rawCustomer.created_at),
    platformCustomerId: String(rawCustomer.id),
    platformUpdatedAt: parseShopifyDate(rawCustomer.updated_at),
    sourceMetadata: createSourceMetadata(rawCustomer),
    username: rawCustomer.email?.split("@")[0],
  };
}

export function mapShopifyOrderCustomer(
  rawOrder: ShopifyRawOrder,
  context: ShopifyCommerceMappingContext,
): NormalizedCommerceCustomer | null {
  const customer = rawOrder.customer;

  if (customer) {
    return mapShopifyCustomer(customer, context);
  }

  const email = rawOrder.email ?? rawOrder.contact_email;
  const address = rawOrder.billing_address ?? rawOrder.shipping_address;

  if (!email) {
    return null;
  }

  return {
    ...baseCommerceFields(context),
    customerRole: "customer",
    email,
    firstName: address?.first_name,
    lastName: address?.last_name,
    platformCreatedAt: parseShopifyDate(rawOrder.created_at),
    platformCustomerId: `shopify-order-customer:${rawOrder.id}`,
    platformUpdatedAt: parseShopifyDate(rawOrder.updated_at),
    sourceMetadata: createSourceMetadata(rawOrder),
    username: email.split("@")[0],
  };
}

export function mapShopifyInventorySnapshot(
  rawInventory: ShopifyRawInventory,
  context: ShopifyCommerceMappingContext & { readonly capturedAt?: Date },
): NormalizedCommerceInventorySnapshot {
  return {
    ...baseCommerceFields(context),
    capturedAt: context.capturedAt ?? context.lastSyncedAt ?? context.importedAt ?? new Date(),
    manageStock: true,
    platformProductId: String(rawInventory.product_id),
    sku: rawInventory.sku,
    sourceMetadata: createSourceMetadata(rawInventory),
    stockQuantity: rawInventory.quantity,
    stockStatus: toStockStatus(rawInventory.quantity),
  };
}

export function mapShopifyRefund(
  rawRefund: ShopifyRawRefund,
  context: ShopifyCommerceMappingContext,
): NormalizedCommerceRefund {
  const transaction = rawRefund.transactions?.[0];

  return {
    ...baseCommerceFields(context),
    amount: transaction?.amount ?? sumRefundLineItems(rawRefund),
    currency: transaction?.currency,
    platformOrderId: rawRefund.order_id === undefined ? undefined : String(rawRefund.order_id),
    platformRefundId: String(rawRefund.id),
    reason: rawRefund.note,
    refundedAt: parseShopifyDate(rawRefund.processed_at ?? rawRefund.created_at),
    refundStatus: transaction?.status ?? "completed",
    sourceMetadata: createSourceMetadata(rawRefund),
  };
}

export function mapShopifyCategories(
  rawCollections: readonly ShopifyRawCollection[],
  context: ShopifyCommerceMappingContext,
): readonly NormalizedCommerceCategory[] {
  return rawCollections.map((collection) => ({
    ...baseCommerceFields(context),
    name: collection.title,
    platformCategoryId: String(collection.id),
    platformParentCategoryId: undefined,
    productCount: collection.products_count,
    slug: collection.handle,
    sourceMetadata: createSourceMetadata(collection),
  }));
}

function baseCommerceFields(context: ShopifyCommerceMappingContext): {
  readonly businessId: string;
  readonly connectedStoreId: string;
  readonly importedAt: Date;
  readonly lastSyncedAt: Date;
  readonly platform: IntegrationPlatform.Shopify;
} {
  const now = new Date();

  return {
    businessId: context.businessId,
    connectedStoreId: context.connectedStoreId,
    importedAt: context.importedAt ?? now,
    lastSyncedAt: context.lastSyncedAt ?? context.importedAt ?? now,
    platform: IntegrationPlatform.Shopify,
  };
}

function createSourceMetadata<TRaw>(raw: TRaw): NormalizedSourceMetadata<TRaw> {
  return { raw, source: "shopify" };
}

function parseShopifyDate(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toStockStatus(stockQuantity: number | undefined): string | undefined {
  if (stockQuantity === undefined) {
    return undefined;
  }

  return stockQuantity > 0 ? "instock" : "outofstock";
}

function sumRefundLineItems(rawRefund: ShopifyRawRefund): string | undefined {
  const values =
    rawRefund.refund_line_items
      ?.map((item) => item.subtotal)
      .map((value) => (value === undefined ? undefined : Number(value)))
      .filter((value): value is number => value !== undefined && Number.isFinite(value)) ?? [];

  return values.length === 0 ? undefined : values.reduce((sum, value) => sum + value, 0).toFixed(2);
}
