import {
  IntegrationPlatform,
  mapTikTokShopCategories,
  mapTikTokShopCustomer,
  mapTikTokShopInventorySnapshot,
  mapTikTokShopOrder,
  mapTikTokShopProduct,
  mapTikTokShopRefund,
  type TikTokShopCommerceMappingContext,
  type TikTokShopRawOrder,
  type TikTokShopRawProduct,
  type TikTokShopRawRefund,
} from "../../../index.js";

const importedAt = new Date("2026-07-03T09:30:00.000Z");
const lastSyncedAt = new Date("2026-07-03T09:45:00.000Z");
const context: TikTokShopCommerceMappingContext = {
  businessId: "business_123",
  connectedStoreId: "store_tiktok_123",
  importedAt,
  lastSyncedAt,
};

describe("TikTok Shop commerce mappers", () => {
  it("maps orders and order items with TikTok source metadata", () => {
    const rawOrder: TikTokShopRawOrder = {
      buyer_email: "buyer@example.com",
      create_time: 1_783_000_000,
      currency: "GBP",
      id: "tt_order_1",
      line_items: [
        {
          id: "line_1",
          product_id: "product_1",
          product_name: "Trail Shoe",
          sale_price: { amount: "35.00", currency: "GBP" },
          seller_sku: "TT-SKU-1",
          sku_id: "sku_1",
          sku_quantity: 2,
        },
      ],
      order_status: "COMPLETED",
      payment: { total_amount: { amount: "70.00", currency: "GBP" } },
      update_time: 1_783_000_060,
    };

    const mapped = mapTikTokShopOrder(rawOrder, context);

    expect(mapped.order).toMatchObject({
      businessId: "business_123",
      connectedStoreId: "store_tiktok_123",
      platform: IntegrationPlatform.TikTokShop,
      platformOrderId: "tt_order_1",
      totalAmount: "70.00",
    });
    expect(mapped.order.sourceMetadata).toEqual({ raw: rawOrder, source: "tiktok_shop" });
    expect(mapped.items[0]).toMatchObject({
      platformOrderItemId: "line_1",
      platformProductId: "product_1",
      platformVariationId: "sku_1",
      quantity: 2,
      sku: "TT-SKU-1",
    });
  });

  it("maps products, categories, customers, inventory, and refunds", () => {
    const rawProduct: TikTokShopRawProduct = {
      category_chains: [{ id: "cat_1", is_leaf: true, local_name: "Shoes" }],
      id: "product_1",
      skus: [
        {
          id: "sku_1",
          inventory: [{ quantity: 4, warehouse_id: "warehouse_1" }],
          price: { amount: "35.00", currency: "GBP" },
          seller_sku: "TT-SKU-1",
        },
      ],
      status: "ACTIVATE",
      title: "Trail Shoe",
    };
    const rawOrder: TikTokShopRawOrder = {
      buyer_email: "buyer@example.com",
      id: "tt_order_1",
      recipient_address: { name: "Ada Lovelace" },
    };
    const rawRefund: TikTokShopRawRefund = {
      id: "refund_1",
      order_id: "tt_order_1",
      reason: "Customer return",
      refund_amount: { amount: "10.00", currency: "GBP" },
      refund_status: "COMPLETED",
    };

    expect(mapTikTokShopProduct(rawProduct, context)).toMatchObject({
      currentStockQuantity: 4,
      name: "Trail Shoe",
      platform: IntegrationPlatform.TikTokShop,
      platformProductId: "product_1",
      sku: "TT-SKU-1",
    });
    expect(mapTikTokShopCategories([rawProduct], context)).toEqual([
      expect.objectContaining({ name: "Shoes", platformCategoryId: "cat_1", productCount: 1 }),
    ]);
    expect(mapTikTokShopCustomer(rawOrder, context)).toMatchObject({
      email: "buyer@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      platformCustomerId: "buyer@example.com",
    });
    expect(
      mapTikTokShopInventorySnapshot(
        { product_id: "product_1", quantity: 4, seller_sku: "TT-SKU-1" },
        context,
      ),
    ).toMatchObject({ platformProductId: "product_1", stockQuantity: 4 });
    expect(mapTikTokShopRefund(rawRefund, context)).toMatchObject({
      amount: "10.00",
      platformOrderId: "tt_order_1",
      platformRefundId: "refund_1",
    });
  });
});
