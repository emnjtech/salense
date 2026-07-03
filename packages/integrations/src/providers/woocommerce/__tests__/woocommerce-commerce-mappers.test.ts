import {
  IntegrationPlatform,
  mapWooCommerceCategory,
  mapWooCommerceCustomer,
  mapWooCommerceInventorySnapshot,
  mapWooCommerceOrder,
  mapWooCommerceProduct,
  mapWooCommerceRefund,
  type WooCommerceCommerceMappingContext,
  type WooCommerceRawCustomer,
  type WooCommerceRawInventoryProduct,
  type WooCommerceRawOrder,
  type WooCommerceRawProduct,
  type WooCommerceRawProductCategory,
  type WooCommerceRawRefund,
} from "../../../index.js";

const importedAt = new Date("2026-07-03T09:30:00.000Z");
const lastSyncedAt = new Date("2026-07-03T09:45:00.000Z");
const context: WooCommerceCommerceMappingContext = {
  businessId: "business_123",
  connectedStoreId: "store_woo_123",
  importedAt,
  lastSyncedAt,
};

describe("WooCommerce commerce mappers", () => {
  it("maps orders, order items, refunds, currency, and source metadata", () => {
    const rawOrder: WooCommerceRawOrder = {
      id: 1205,
      number: "WC-1205",
      status: "processing",
      currency: "GBP",
      discount_total: "5.00",
      shipping_total: "4.99",
      total: "74.99",
      total_tax: "12.50",
      date_created_gmt: "2026-07-02T12:00:00",
      date_modified_gmt: "2026-07-02T12:05:00",
      customer_id: 77,
      line_items: [
        {
          id: 501,
          name: "Trail Shoe",
          price: 35,
          product_id: 9001,
          variation_id: 0,
          quantity: 2,
          sku: "SHOE-TRAIL-9",
          subtotal: "70.00",
          total: "70.00",
          total_tax: "11.67",
        },
      ],
      refunds: [{ id: 44, reason: "Customer return", total: "10.00" }],
    };

    const mapped = mapWooCommerceOrder(rawOrder, context);

    expect(mapped.order).toMatchObject({
      businessId: "business_123",
      connectedStoreId: "store_woo_123",
      platform: IntegrationPlatform.WooCommerce,
      platformOrderId: "1205",
      platformOrderNumber: "WC-1205",
      orderStatus: "processing",
      currency: "GBP",
      subtotalAmount: "70.00",
      totalAmount: "74.99",
      taxAmount: "12.50",
      shippingAmount: "4.99",
      discountAmount: "5.00",
      refundedAmount: "10.00",
      importedAt,
      lastSyncedAt,
    });
    expect(mapped.order.orderedAt?.toISOString()).toBe("2026-07-02T12:00:00.000Z");
    expect(mapped.order.platformUpdatedAt?.toISOString()).toBe("2026-07-02T12:05:00.000Z");
    expect(mapped.order.sourceMetadata).toEqual({ source: "woocommerce", raw: rawOrder });

    expect(mapped.items).toHaveLength(1);
    expect(mapped.items[0]).toMatchObject({
      businessId: "business_123",
      connectedStoreId: "store_woo_123",
      platform: IntegrationPlatform.WooCommerce,
      platformOrderId: "1205",
      platformOrderItemId: "501",
      platformProductId: "9001",
      platformVariationId: undefined,
      sku: "SHOE-TRAIL-9",
      name: "Trail Shoe",
      quantity: 2,
      unitPriceAmount: "35",
      subtotalAmount: "70.00",
      totalAmount: "70.00",
      taxAmount: "11.67",
    });
    expect(mapped.items[0]?.sourceMetadata.raw).toBe(rawOrder.line_items?.[0]);

    expect(mapped.refunds).toEqual([
      expect.objectContaining({
        platform: IntegrationPlatform.WooCommerce,
        platformRefundId: "44",
        platformOrderId: "1205",
        reason: "Customer return",
        currency: "GBP",
        amount: "10.00",
      }),
    ]);
    expect(mapped.refunds[0]?.sourceMetadata.raw).toBe(rawOrder.refunds?.[0]);
  });

  it("maps products without merging across platforms or stores", () => {
    const rawProduct: WooCommerceRawProduct = {
      id: 9001,
      name: "Trail Shoe",
      slug: "trail-shoe",
      sku: "SHOE-TRAIL-9",
      type: "variable",
      status: "publish",
      price: "35.00",
      regular_price: "45.00",
      sale_price: "35.00",
      manage_stock: true,
      stock_quantity: 14,
      stock_status: "instock",
      categories: [{ id: 12, name: "Shoes", slug: "shoes" }],
      date_created_gmt: "2026-06-01T08:00:00",
      date_modified_gmt: "2026-07-01T08:00:00",
    };

    const mapped = mapWooCommerceProduct(rawProduct, { ...context, currency: "GBP" });

    expect(mapped).toMatchObject({
      businessId: "business_123",
      connectedStoreId: "store_woo_123",
      platform: IntegrationPlatform.WooCommerce,
      platformProductId: "9001",
      sku: "SHOE-TRAIL-9",
      name: "Trail Shoe",
      productType: "variable",
      productStatus: "publish",
      currency: "GBP",
      priceAmount: "35.00",
      regularPriceAmount: "45.00",
      salePriceAmount: "35.00",
      stockStatus: "instock",
      currentStockQuantity: 14,
    });
    expect(mapped.sourceMetadata).toEqual({ source: "woocommerce", raw: rawProduct });
  });

  it("maps customers with platform-scoped identity", () => {
    const rawCustomer: WooCommerceRawCustomer = {
      id: 77,
      email: "buyer@example.com",
      first_name: "Ada",
      last_name: "Lovelace",
      username: "ada77",
      role: "customer",
      date_created_gmt: "2026-06-20T09:00:00",
      date_modified_gmt: "2026-07-01T09:00:00",
    };

    const mapped = mapWooCommerceCustomer(rawCustomer, context);

    expect(mapped).toMatchObject({
      platform: IntegrationPlatform.WooCommerce,
      platformCustomerId: "77",
      email: "buyer@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      username: "ada77",
      customerRole: "customer",
    });
    expect(mapped.platformCreatedAt?.toISOString()).toBe("2026-06-20T09:00:00.000Z");
    expect(mapped.sourceMetadata.raw).toBe(rawCustomer);
  });

  it("maps inventory snapshots from WooCommerce product stock fields", () => {
    const capturedAt = new Date("2026-07-03T10:00:00.000Z");
    const rawInventory: WooCommerceRawInventoryProduct = {
      id: 9001,
      name: "Trail Shoe",
      sku: "SHOE-TRAIL-9",
      manage_stock: true,
      stock_quantity: 14,
      stock_status: "instock",
      date_modified_gmt: "2026-07-01T08:00:00",
    };

    const mapped = mapWooCommerceInventorySnapshot(rawInventory, { ...context, capturedAt });

    expect(mapped).toMatchObject({
      platform: IntegrationPlatform.WooCommerce,
      platformProductId: "9001",
      sku: "SHOE-TRAIL-9",
      stockQuantity: 14,
      stockStatus: "instock",
      manageStock: true,
      capturedAt,
    });
    expect(mapped.sourceMetadata.raw).toBe(rawInventory);
  });

  it("maps categories with platform parent identity", () => {
    const rawCategory: WooCommerceRawProductCategory = {
      id: 12,
      name: "Shoes",
      slug: "shoes",
      parent: 3,
      count: 42,
    };

    const mapped = mapWooCommerceCategory(rawCategory, context);

    expect(mapped).toMatchObject({
      platform: IntegrationPlatform.WooCommerce,
      platformCategoryId: "12",
      platformParentCategoryId: "3",
      name: "Shoes",
      slug: "shoes",
      productCount: 42,
    });
    expect(mapped.sourceMetadata.raw).toBe(rawCategory);
  });

  it("maps standalone refunds without overwriting original values", () => {
    const rawRefund: WooCommerceRawRefund = {
      id: 909,
      status: "completed",
      reason: "Damaged parcel",
      amount: "12.34",
      total: "99.99",
      total_tax: "2.06",
      date_created_gmt: "2026-07-03T07:00:00",
      refunded_by: 5,
      refunded_payment: true,
    };

    const mapped = mapWooCommerceRefund(rawRefund, {
      ...context,
      currency: "GBP",
      platformOrderId: "1205",
    });

    expect(mapped).toMatchObject({
      platform: IntegrationPlatform.WooCommerce,
      platformRefundId: "909",
      platformOrderId: "1205",
      refundStatus: "completed",
      reason: "Damaged parcel",
      currency: "GBP",
      amount: "12.34",
    });
    expect(mapped.refundedAt?.toISOString()).toBe("2026-07-03T07:00:00.000Z");
    expect(mapped.sourceMetadata.raw).toBe(rawRefund);
  });

  it("handles missing optional fields safely", () => {
    const mappedOrder = mapWooCommerceOrder({ id: 1 }, context);
    const mappedProduct = mapWooCommerceProduct({ id: 2, stock_quantity: null }, context);
    const mappedCustomer = mapWooCommerceCustomer({ id: 3 }, context);
    const mappedCategory = mapWooCommerceCategory({ id: 4, parent: 0 }, context);

    expect(mappedOrder.order).toMatchObject({
      platformOrderId: "1",
      currency: undefined,
      subtotalAmount: undefined,
      orderedAt: undefined,
    });
    expect(mappedProduct).toMatchObject({
      platformProductId: "2",
      currentStockQuantity: undefined,
      currency: undefined,
    });
    expect(mappedCustomer).toMatchObject({ platformCustomerId: "3", email: undefined });
    expect(mappedCategory).toMatchObject({
      platformCategoryId: "4",
      platformParentCategoryId: undefined,
    });
  });

  it("preserves source identity fields across mapped record types", () => {
    const records = [
      mapWooCommerceOrder({ id: 1 }, context).order,
      mapWooCommerceProduct({ id: 2 }, context),
      mapWooCommerceCustomer({ id: 3 }, context),
      mapWooCommerceInventorySnapshot({ id: 4 }, context),
      mapWooCommerceCategory({ id: 5 }, context),
      mapWooCommerceRefund({ id: 6 }, { ...context, platformOrderId: "1" }),
    ];

    for (const record of records) {
      expect(record.businessId).toBe("business_123");
      expect(record.connectedStoreId).toBe("store_woo_123");
      expect(record.platform).toBe(IntegrationPlatform.WooCommerce);
      expect(record.sourceMetadata.source).toBe("woocommerce");
      expect(record.importedAt).toBe(importedAt);
      expect(record.lastSyncedAt).toBe(lastSyncedAt);
    }
  });
});
