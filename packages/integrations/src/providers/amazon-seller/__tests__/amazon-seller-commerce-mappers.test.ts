import {
  IntegrationPlatform,
  mapAmazonSellerCategories,
  mapAmazonSellerCustomer,
  mapAmazonSellerInventorySnapshot,
  mapAmazonSellerOrder,
  mapAmazonSellerProduct,
  mapAmazonSellerRefund,
  type AmazonSellerCommerceMappingContext,
  type AmazonSellerRawCatalogItem,
  type AmazonSellerRawInventorySummary,
  type AmazonSellerRawOrder,
  type AmazonSellerRawRefundEvent,
} from "../../../index.js";

const importedAt = new Date("2026-07-03T09:30:00.000Z");
const lastSyncedAt = new Date("2026-07-03T09:45:00.000Z");
const context: AmazonSellerCommerceMappingContext = {
  businessId: "business_123",
  connectedStoreId: "store_amazon_123",
  importedAt,
  lastSyncedAt,
};

describe("Amazon Seller commerce mappers", () => {
  it("maps orders and order items with platform-scoped source metadata", () => {
    const rawOrder: AmazonSellerRawOrder = {
      AmazonOrderId: "026-1234567-1234567",
      BuyerInfo: {
        BuyerEmail: "buyer@example.com",
        BuyerName: "Ada Lovelace",
      },
      LastUpdateDate: "2026-07-02T12:05:00Z",
      OrderStatus: "Shipped",
      OrderTotal: { Amount: "74.99", CurrencyCode: "GBP" },
      PurchaseDate: "2026-07-02T12:00:00Z",
    };

    const mapped = mapAmazonSellerOrder(
      rawOrder,
      [
        {
          ASIN: "B000TEST",
          ItemPrice: { Amount: "74.99", CurrencyCode: "GBP" },
          ItemTax: { Amount: "12.50", CurrencyCode: "GBP" },
          OrderItemId: "item_1",
          QuantityOrdered: 2,
          SellerSKU: "AMZ-SKU-1",
          Title: "Trail Shoe",
        },
      ],
      context,
    );

    expect(mapped.order).toMatchObject({
      businessId: "business_123",
      connectedStoreId: "store_amazon_123",
      currency: "GBP",
      platform: IntegrationPlatform.AmazonSeller,
      platformOrderId: "026-1234567-1234567",
      platformOrderNumber: "026-1234567-1234567",
      totalAmount: "74.99",
    });
    expect(mapped.order.orderedAt?.toISOString()).toBe("2026-07-02T12:00:00.000Z");
    expect(mapped.order.sourceMetadata).toEqual({ raw: rawOrder, source: "amazon_seller" });
    expect(mapped.items[0]).toMatchObject({
      platform: IntegrationPlatform.AmazonSeller,
      platformOrderId: "026-1234567-1234567",
      platformOrderItemId: "item_1",
      platformProductId: "B000TEST",
      quantity: 2,
      sku: "AMZ-SKU-1",
    });
  });

  it("maps products, derived categories, and inventory without merging platforms", () => {
    const rawProduct: AmazonSellerRawCatalogItem = {
      asin: "B000TEST",
      productTypes: [{ marketplaceId: "A1F83G8C2ARO7P", productType: "SHOES" }],
      summaries: [{ itemName: "Trail Shoe", marketplaceId: "A1F83G8C2ARO7P" }],
    };
    const rawInventory: AmazonSellerRawInventorySummary = {
      asin: "B000TEST",
      inventoryDetails: { fulfillableQuantity: 4 },
      sellerSku: "AMZ-SKU-1",
      totalQuantity: 4,
    };

    expect(mapAmazonSellerProduct(rawProduct, { ...context, currency: "GBP" })).toMatchObject({
      currency: "GBP",
      name: "Trail Shoe",
      platform: IntegrationPlatform.AmazonSeller,
      platformProductId: "B000TEST",
      productType: "SHOES",
    });
    expect(mapAmazonSellerCategories([rawProduct], context)).toEqual([
      expect.objectContaining({
        platform: IntegrationPlatform.AmazonSeller,
        platformCategoryId: "SHOES",
        productCount: 1,
      }),
    ]);
    expect(mapAmazonSellerInventorySnapshot(rawInventory, context)).toMatchObject({
      platform: IntegrationPlatform.AmazonSeller,
      platformProductId: "B000TEST",
      sku: "AMZ-SKU-1",
      stockQuantity: 4,
      stockStatus: "instock",
    });
  });

  it("maps customers and refunds from read-only Amazon order data", () => {
    const rawOrder: AmazonSellerRawOrder = {
      AmazonOrderId: "026-1234567-1234567",
      BuyerInfo: {
        BuyerEmail: "buyer@example.com",
        BuyerName: "Ada Lovelace",
      },
      PurchaseDate: "2026-07-02T12:00:00Z",
    };
    const rawRefund: AmazonSellerRawRefundEvent = {
      AmazonOrderId: "026-1234567-1234567",
      PostedDate: "2026-07-03T07:00:00Z",
      ShipmentItemAdjustmentList: [
        {
          ItemChargeAdjustmentList: [
            { ChargeAmount: { Amount: "10.00", CurrencyCode: "GBP" } },
            { ChargeAmount: { Amount: "2.50", CurrencyCode: "GBP" } },
          ],
        },
      ],
    };

    expect(mapAmazonSellerCustomer(rawOrder, context)).toMatchObject({
      customerRole: "buyer",
      email: "buyer@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      platform: IntegrationPlatform.AmazonSeller,
      platformCustomerId: "buyer@example.com",
    });
    expect(mapAmazonSellerRefund(rawRefund, context)).toMatchObject({
      amount: "12.50",
      currency: "GBP",
      platform: IntegrationPlatform.AmazonSeller,
      platformOrderId: "026-1234567-1234567",
      refundStatus: "completed",
    });
  });
});
