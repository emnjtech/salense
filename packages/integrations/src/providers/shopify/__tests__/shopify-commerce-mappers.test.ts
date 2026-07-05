import {
  IntegrationPlatform,
  mapShopifyCategories,
  mapShopifyCustomer,
  mapShopifyInventorySnapshot,
  mapShopifyOrder,
  mapShopifyOrderCustomer,
  mapShopifyProduct,
  mapShopifyRefund,
  type ShopifyCommerceMappingContext,
  type ShopifyRawCollection,
  type ShopifyRawCustomer,
  type ShopifyRawOrder,
  type ShopifyRawProduct,
  type ShopifyRawRefund,
} from "../../../index.js";

const importedAt = new Date("2026-07-03T09:30:00.000Z");
const lastSyncedAt = new Date("2026-07-03T09:45:00.000Z");
const context: ShopifyCommerceMappingContext = {
  businessId: "business_123",
  connectedStoreId: "store_shopify_123",
  importedAt,
  lastSyncedAt,
};

describe("Shopify commerce mappers", () => {
  it("maps orders and order items with Shopify source metadata", () => {
    const rawOrder: ShopifyRawOrder = {
      created_at: "2026-07-03T08:00:00Z",
      currency: "GBP",
      current_subtotal_price: "64.00",
      current_total_price: "70.00",
      current_total_tax: "6.00",
      financial_status: "paid",
      id: 1001,
      line_items: [
        {
          id: 2001,
          price: "32.00",
          product_id: 3001,
          quantity: 2,
          sku: "SHOP-BAMBOO-1",
          title: "Bamboo Drawer Divider",
          variant_id: 4001,
        },
      ],
      name: "#1001",
      processed_at: "2026-07-03T08:01:00Z",
      updated_at: "2026-07-03T08:05:00Z",
    };

    const mapped = mapShopifyOrder(rawOrder, context);

    expect(mapped.order).toMatchObject({
      businessId: "business_123",
      connectedStoreId: "store_shopify_123",
      platform: IntegrationPlatform.Shopify,
      platformOrderId: "1001",
      platformOrderNumber: "#1001",
      totalAmount: "70.00",
    });
    expect(mapped.order.sourceMetadata).toEqual({ raw: rawOrder, source: "shopify" });
    expect(mapped.items[0]).toMatchObject({
      name: "Bamboo Drawer Divider",
      platformOrderItemId: "2001",
      platformProductId: "3001",
      platformVariationId: "4001",
      quantity: 2,
      sku: "SHOP-BAMBOO-1",
      totalAmount: "64.00",
    });
  });

  it("maps products, collections, customers, inventory, and refunds", () => {
    const rawProduct: ShopifyRawProduct = {
      created_at: "2026-07-01T10:00:00Z",
      id: 3001,
      product_type: "Home Storage",
      status: "active",
      title: "Bamboo Drawer Divider",
      variants: [
        {
          compare_at_price: "39.00",
          id: 4001,
          inventory_item_id: 5001,
          inventory_quantity: 8,
          price: "32.00",
          sku: "SHOP-BAMBOO-1",
        },
      ],
    };
    const rawCollection: ShopifyRawCollection = {
      handle: "home-storage",
      id: 7001,
      products_count: 3,
      title: "Home Storage",
    };
    const rawCustomer: ShopifyRawCustomer = {
      email: "ada@example.com",
      first_name: "Ada",
      id: 6001,
      last_name: "Lovelace",
    };
    const rawOrderWithoutCustomer: ShopifyRawOrder = {
      billing_address: { first_name: "Grace", last_name: "Hopper" },
      email: "grace@example.com",
      id: 1002,
    };
    const rawRefund: ShopifyRawRefund = {
      id: 8001,
      note: "Customer return",
      order_id: 1001,
      refund_line_items: [{ subtotal: "10.00" }],
    };

    expect(mapShopifyProduct(rawProduct, context)).toMatchObject({
      currentStockQuantity: 8,
      name: "Bamboo Drawer Divider",
      platform: IntegrationPlatform.Shopify,
      platformProductId: "3001",
      platformVariationId: "4001",
      priceAmount: "32.00",
      sku: "SHOP-BAMBOO-1",
      stockStatus: "instock",
    });
    expect(mapShopifyCategories([rawCollection], context)).toEqual([
      expect.objectContaining({
        name: "Home Storage",
        platformCategoryId: "7001",
        productCount: 3,
        slug: "home-storage",
      }),
    ]);
    expect(mapShopifyCustomer(rawCustomer, context)).toMatchObject({
      email: "ada@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      platformCustomerId: "6001",
    });
    expect(mapShopifyOrderCustomer(rawOrderWithoutCustomer, context)).toMatchObject({
      email: "grace@example.com",
      firstName: "Grace",
      lastName: "Hopper",
      platformCustomerId: "shopify-order-customer:1002",
    });
    expect(
      mapShopifyInventorySnapshot(
        { inventory_item_id: 5001, product_id: 3001, quantity: 8, sku: "SHOP-BAMBOO-1" },
        context,
      ),
    ).toMatchObject({ platformProductId: "3001", stockQuantity: 8, stockStatus: "instock" });
    expect(mapShopifyRefund(rawRefund, context)).toMatchObject({
      amount: "10.00",
      platformOrderId: "1001",
      platformRefundId: "8001",
      reason: "Customer return",
    });
  });
});
