import { IntegrationPlatform } from "../../types/integration-platform.js";
import type {
  WooCommerceRawCustomer,
  WooCommerceRawInventoryProduct,
  WooCommerceRawMoneyTotals,
  WooCommerceRawOrder,
  WooCommerceRawOrderLineItem,
  WooCommerceRawOrderRefundReference,
  WooCommerceRawProduct,
  WooCommerceRawProductCategory,
  WooCommerceRawRefund,
} from "./woocommerce-raw-models.js";

export interface WooCommerceCommerceMappingContext {
  readonly businessId: string;
  readonly connectedStoreId: string;
  readonly importedAt?: Date;
  readonly lastSyncedAt?: Date;
}

export interface WooCommerceOrderChildMappingContext extends WooCommerceCommerceMappingContext {
  readonly currency?: string;
  readonly platformOrderId: string;
}

export interface WooCommerceRefundMappingContext extends WooCommerceCommerceMappingContext {
  readonly currency?: string;
  readonly platformOrderId?: string;
}

export interface NormalizedSourceMetadata<TRaw> {
  readonly source: "woocommerce" | "amazon_seller";
  readonly raw: TRaw;
}

export interface NormalizedCommerceOrder {
  readonly businessId: string;
  readonly connectedStoreId: string;
  readonly platform: IntegrationPlatform;
  readonly platformOrderId: string;
  readonly platformOrderNumber: string | undefined;
  readonly orderStatus: string | undefined;
  readonly currency: string | undefined;
  readonly subtotalAmount: string | undefined;
  readonly totalAmount: string | undefined;
  readonly taxAmount: string | undefined;
  readonly shippingAmount: string | undefined;
  readonly discountAmount: string | undefined;
  readonly refundedAmount: string | undefined;
  readonly orderedAt: Date | undefined;
  readonly platformCreatedAt: Date | undefined;
  readonly platformUpdatedAt: Date | undefined;
  readonly sourceMetadata: NormalizedSourceMetadata<unknown>;
  readonly importedAt: Date;
  readonly lastSyncedAt: Date;
}

export interface NormalizedCommerceOrderItem {
  readonly businessId: string;
  readonly connectedStoreId: string;
  readonly platform: IntegrationPlatform;
  readonly platformOrderId: string;
  readonly platformOrderItemId: string;
  readonly platformProductId: string | undefined;
  readonly platformVariationId: string | undefined;
  readonly sku: string | undefined;
  readonly name: string | undefined;
  readonly quantity: number | undefined;
  readonly unitPriceAmount: string | undefined;
  readonly subtotalAmount: string | undefined;
  readonly totalAmount: string | undefined;
  readonly taxAmount: string | undefined;
  readonly sourceMetadata: NormalizedSourceMetadata<unknown>;
  readonly importedAt: Date;
  readonly lastSyncedAt: Date;
}

export interface NormalizedCommerceProduct {
  readonly businessId: string;
  readonly connectedStoreId: string;
  readonly platform: IntegrationPlatform;
  readonly platformProductId: string;
  readonly platformVariationId: string | undefined;
  readonly sku: string | undefined;
  readonly name: string | undefined;
  readonly productType: string | undefined;
  readonly productStatus: string | undefined;
  readonly currency: string | undefined;
  readonly priceAmount: string | undefined;
  readonly regularPriceAmount: string | undefined;
  readonly salePriceAmount: string | undefined;
  readonly stockStatus: string | undefined;
  readonly currentStockQuantity: number | undefined;
  readonly platformCreatedAt: Date | undefined;
  readonly platformUpdatedAt: Date | undefined;
  readonly sourceMetadata: NormalizedSourceMetadata<unknown>;
  readonly importedAt: Date;
  readonly lastSyncedAt: Date;
}

export interface NormalizedCommerceCustomer {
  readonly businessId: string;
  readonly connectedStoreId: string;
  readonly platform: IntegrationPlatform;
  readonly platformCustomerId: string;
  readonly email: string | undefined;
  readonly firstName: string | undefined;
  readonly lastName: string | undefined;
  readonly username: string | undefined;
  readonly customerRole: string | undefined;
  readonly platformCreatedAt: Date | undefined;
  readonly platformUpdatedAt: Date | undefined;
  readonly sourceMetadata: NormalizedSourceMetadata<unknown>;
  readonly importedAt: Date;
  readonly lastSyncedAt: Date;
}

export interface NormalizedCommerceInventorySnapshot {
  readonly businessId: string;
  readonly connectedStoreId: string;
  readonly platform: IntegrationPlatform;
  readonly platformProductId: string;
  readonly sku: string | undefined;
  readonly stockQuantity: number | undefined;
  readonly stockStatus: string | undefined;
  readonly manageStock: boolean | undefined;
  readonly capturedAt: Date;
  readonly sourceMetadata: NormalizedSourceMetadata<unknown>;
  readonly importedAt: Date;
  readonly lastSyncedAt: Date;
}

export interface NormalizedCommerceCategory {
  readonly businessId: string;
  readonly connectedStoreId: string;
  readonly platform: IntegrationPlatform;
  readonly platformCategoryId: string;
  readonly platformParentCategoryId: string | undefined;
  readonly name: string | undefined;
  readonly slug: string | undefined;
  readonly productCount: number | undefined;
  readonly sourceMetadata: NormalizedSourceMetadata<unknown>;
  readonly importedAt: Date;
  readonly lastSyncedAt: Date;
}

export interface NormalizedCommerceRefund {
  readonly businessId: string;
  readonly connectedStoreId: string;
  readonly platform: IntegrationPlatform;
  readonly platformRefundId: string;
  readonly platformOrderId: string | undefined;
  readonly refundStatus: string | undefined;
  readonly reason: string | undefined;
  readonly currency: string | undefined;
  readonly amount: string | undefined;
  readonly refundedAt: Date | undefined;
  readonly sourceMetadata: NormalizedSourceMetadata<unknown>;
  readonly importedAt: Date;
  readonly lastSyncedAt: Date;
}

export interface NormalizedWooCommerceOrderTree {
  readonly order: NormalizedCommerceOrder;
  readonly items: readonly NormalizedCommerceOrderItem[];
  readonly refunds: readonly NormalizedCommerceRefund[];
}

export function mapWooCommerceOrder(
  rawOrder: WooCommerceRawOrder,
  context: WooCommerceCommerceMappingContext,
): NormalizedWooCommerceOrderTree {
  const orderContext: WooCommerceOrderChildMappingContext = {
    ...context,
    platformOrderId: String(rawOrder.id),
    ...(rawOrder.currency === undefined ? {} : { currency: rawOrder.currency }),
  };

  return {
    order: {
      ...baseCommerceFields(context),
      platformOrderId: String(rawOrder.id),
      platformOrderNumber: rawOrder.number,
      orderStatus: rawOrder.status,
      currency: rawOrder.currency,
      subtotalAmount: sumLineItemTotals(rawOrder.line_items, "subtotal"),
      totalAmount: rawOrder.total,
      taxAmount: rawOrder.total_tax,
      shippingAmount: rawOrder.shipping_total,
      discountAmount: rawOrder.discount_total,
      refundedAmount: sumRefundTotals(rawOrder.refunds),
      orderedAt: parseWooCommerceDate(rawOrder.date_created_gmt),
      platformCreatedAt: parseWooCommerceDate(rawOrder.date_created_gmt),
      platformUpdatedAt: parseWooCommerceDate(rawOrder.date_modified_gmt),
      sourceMetadata: createSourceMetadata(rawOrder),
    },
    items: (rawOrder.line_items ?? []).map((item) => mapWooCommerceOrderItem(item, orderContext)),
    refunds: (rawOrder.refunds ?? []).map((refund) =>
      mapWooCommerceOrderRefundReference(refund, orderContext),
    ),
  };
}

export function mapWooCommerceOrderItem(
  rawItem: WooCommerceRawOrderLineItem,
  context: WooCommerceOrderChildMappingContext,
): NormalizedCommerceOrderItem {
  return {
    ...baseCommerceFields(context),
    platformOrderId: context.platformOrderId,
    platformOrderItemId: String(rawItem.id),
    platformProductId: toOptionalId(rawItem.product_id),
    platformVariationId: toOptionalId(rawItem.variation_id),
    sku: rawItem.sku,
    name: rawItem.name,
    quantity: rawItem.quantity,
    unitPriceAmount: rawItem.price === undefined ? undefined : String(rawItem.price),
    subtotalAmount: rawItem.subtotal,
    totalAmount: rawItem.total,
    taxAmount: rawItem.total_tax,
    sourceMetadata: createSourceMetadata(rawItem),
  };
}

export function mapWooCommerceProduct(
  rawProduct: WooCommerceRawProduct,
  context: WooCommerceCommerceMappingContext & { readonly currency?: string },
): NormalizedCommerceProduct {
  return {
    ...baseCommerceFields(context),
    platformProductId: String(rawProduct.id),
    platformVariationId: undefined,
    sku: rawProduct.sku,
    name: rawProduct.name,
    productType: rawProduct.type,
    productStatus: rawProduct.status,
    currency: context.currency,
    priceAmount: rawProduct.price,
    regularPriceAmount: rawProduct.regular_price,
    salePriceAmount: rawProduct.sale_price,
    stockStatus: rawProduct.stock_status,
    currentStockQuantity: toOptionalNumber(rawProduct.stock_quantity),
    platformCreatedAt: parseWooCommerceDate(rawProduct.date_created_gmt),
    platformUpdatedAt: parseWooCommerceDate(rawProduct.date_modified_gmt),
    sourceMetadata: createSourceMetadata(rawProduct),
  };
}

export function mapWooCommerceCustomer(
  rawCustomer: WooCommerceRawCustomer,
  context: WooCommerceCommerceMappingContext,
): NormalizedCommerceCustomer {
  return {
    ...baseCommerceFields(context),
    platformCustomerId: String(rawCustomer.id),
    email: rawCustomer.email,
    firstName: rawCustomer.first_name,
    lastName: rawCustomer.last_name,
    username: rawCustomer.username,
    customerRole: rawCustomer.role,
    platformCreatedAt: parseWooCommerceDate(rawCustomer.date_created_gmt),
    platformUpdatedAt: parseWooCommerceDate(rawCustomer.date_modified_gmt),
    sourceMetadata: createSourceMetadata(rawCustomer),
  };
}

export function mapWooCommerceInventorySnapshot(
  rawProduct: WooCommerceRawInventoryProduct,
  context: WooCommerceCommerceMappingContext & { readonly capturedAt?: Date },
): NormalizedCommerceInventorySnapshot {
  return {
    ...baseCommerceFields(context),
    platformProductId: String(rawProduct.id),
    sku: rawProduct.sku,
    stockQuantity: toOptionalNumber(rawProduct.stock_quantity),
    stockStatus: rawProduct.stock_status,
    manageStock: rawProduct.manage_stock,
    capturedAt: context.capturedAt ?? context.lastSyncedAt ?? context.importedAt ?? new Date(),
    sourceMetadata: createSourceMetadata(rawProduct),
  };
}

export function mapWooCommerceCategory(
  rawCategory: WooCommerceRawProductCategory,
  context: WooCommerceCommerceMappingContext,
): NormalizedCommerceCategory {
  return {
    ...baseCommerceFields(context),
    platformCategoryId: String(rawCategory.id),
    platformParentCategoryId:
      rawCategory.parent && rawCategory.parent > 0 ? String(rawCategory.parent) : undefined,
    name: rawCategory.name,
    slug: rawCategory.slug,
    productCount: rawCategory.count,
    sourceMetadata: createSourceMetadata(rawCategory),
  };
}

export function mapWooCommerceRefund(
  rawRefund: WooCommerceRawRefund,
  context: WooCommerceRefundMappingContext,
): NormalizedCommerceRefund {
  return {
    ...baseCommerceFields(context),
    platformRefundId: String(rawRefund.id),
    platformOrderId: context.platformOrderId,
    refundStatus: rawRefund.status,
    reason: rawRefund.reason,
    currency: context.currency,
    amount: rawRefund.amount ?? rawRefund.total,
    refundedAt: parseWooCommerceDate(rawRefund.date_created_gmt),
    sourceMetadata: createSourceMetadata(rawRefund),
  };
}

function mapWooCommerceOrderRefundReference(
  rawRefund: WooCommerceRawOrderRefundReference,
  context: WooCommerceOrderChildMappingContext,
): NormalizedCommerceRefund {
  return {
    ...baseCommerceFields(context),
    platformRefundId: String(rawRefund.id),
    platformOrderId: context.platformOrderId,
    refundStatus: undefined,
    reason: rawRefund.reason,
    currency: context.currency,
    amount: rawRefund.total,
    refundedAt: undefined,
    sourceMetadata: createSourceMetadata(rawRefund),
  };
}

function baseCommerceFields(context: WooCommerceCommerceMappingContext): {
  readonly businessId: string;
  readonly connectedStoreId: string;
  readonly importedAt: Date;
  readonly lastSyncedAt: Date;
  readonly platform: IntegrationPlatform.WooCommerce;
} {
  const now = new Date();

  return {
    businessId: context.businessId,
    connectedStoreId: context.connectedStoreId,
    importedAt: context.importedAt ?? now,
    lastSyncedAt: context.lastSyncedAt ?? context.importedAt ?? now,
    platform: IntegrationPlatform.WooCommerce,
  };
}

function createSourceMetadata<TRaw>(raw: TRaw): NormalizedSourceMetadata<TRaw> {
  return {
    raw,
    source: "woocommerce",
  };
}

function parseWooCommerceDate(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value.endsWith("Z") ? value : `${value}Z`);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function sumLineItemTotals(
  lineItems: readonly WooCommerceRawOrderLineItem[] | undefined,
  field: keyof WooCommerceRawMoneyTotals,
): string | undefined {
  return sumMoneyValues(lineItems?.map((item) => item[field]));
}

function sumRefundTotals(
  refunds: readonly WooCommerceRawOrderRefundReference[] | undefined,
): string | undefined {
  return sumMoneyValues(refunds?.map((refund) => refund.total));
}

function sumMoneyValues(values: readonly (string | undefined)[] | undefined): string | undefined {
  const parsedValues = (values ?? [])
    .filter((value): value is string => value !== undefined && value.trim() !== "")
    .map((value) => Number.parseFloat(value));

  if (parsedValues.length === 0 || parsedValues.some((value) => !Number.isFinite(value))) {
    return undefined;
  }

  const total = parsedValues.reduce((sum, value) => sum + value, 0);

  return total.toFixed(2);
}

function toOptionalId(value: number | undefined): string | undefined {
  return value === undefined || value === 0 ? undefined : String(value);
}

function toOptionalNumber(value: number | null | undefined): number | undefined {
  return value === null ? undefined : value;
}
