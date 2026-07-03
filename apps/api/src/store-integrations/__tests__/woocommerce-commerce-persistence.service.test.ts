import {
  IntegrationPlatform,
  mapWooCommerceCategory,
  mapWooCommerceCustomer,
  mapWooCommerceInventorySnapshot,
  mapWooCommerceOrder,
  mapWooCommerceProduct,
  mapWooCommerceRefund,
  type WooCommerceCommerceMappingContext,
} from "@salense/integrations";
import type { PrismaService } from "../../database/prisma.service.js";
import { WooCommerceCommercePersistenceService } from "../woocommerce-commerce-persistence.service.js";

const importedAt = new Date("2026-07-03T09:00:00.000Z");
const lastSyncedAt = new Date("2026-07-03T09:05:00.000Z");
const context: WooCommerceCommerceMappingContext = {
  businessId: "business_1",
  connectedStoreId: "store_1",
  importedAt,
  lastSyncedAt,
};

function createServiceMocks(): {
  readonly service: WooCommerceCommercePersistenceService;
  readonly commerceOrderFindUnique: jest.Mock;
  readonly commerceOrderUpsert: jest.Mock;
  readonly commerceOrderItemUpsert: jest.Mock;
  readonly commerceProductUpsert: jest.Mock;
  readonly commerceCustomerUpsert: jest.Mock;
  readonly commerceInventorySnapshotUpsert: jest.Mock;
  readonly commerceCategoryUpsert: jest.Mock;
  readonly commerceRefundUpsert: jest.Mock;
  readonly connectedStoreUpdate: jest.Mock;
} {
  const commerceOrderFindUnique = jest.fn();
  const commerceOrderUpsert = jest.fn().mockResolvedValue({ id: "order_db_1" });
  const commerceOrderItemUpsert = jest.fn();
  const commerceProductUpsert = jest.fn();
  const commerceCustomerUpsert = jest.fn();
  const commerceInventorySnapshotUpsert = jest.fn();
  const commerceCategoryUpsert = jest.fn();
  const commerceRefundUpsert = jest.fn();
  const connectedStoreUpdate = jest.fn();
  const prismaService = {
    client: {
      commerceCategory: { upsert: commerceCategoryUpsert },
      commerceCustomer: { upsert: commerceCustomerUpsert },
      commerceInventorySnapshot: { upsert: commerceInventorySnapshotUpsert },
      commerceOrder: { findUnique: commerceOrderFindUnique, upsert: commerceOrderUpsert },
      commerceOrderItem: { upsert: commerceOrderItemUpsert },
      commerceProduct: { upsert: commerceProductUpsert },
      commerceRefund: { upsert: commerceRefundUpsert },
      connectedStore: { update: connectedStoreUpdate },
    },
  } as unknown as PrismaService;

  return {
    service: new WooCommerceCommercePersistenceService(prismaService),
    commerceCategoryUpsert,
    commerceCustomerUpsert,
    commerceInventorySnapshotUpsert,
    commerceOrderFindUnique,
    commerceOrderItemUpsert,
    commerceOrderUpsert,
    commerceProductUpsert,
    commerceRefundUpsert,
    connectedStoreUpdate,
  };
}

describe("WooCommerceCommercePersistenceService", () => {
  it("persists orders with order items and refunds linked to the local order", async () => {
    const { service, commerceOrderUpsert, commerceOrderItemUpsert, commerceRefundUpsert } =
      createServiceMocks();
    const orderTree = mapWooCommerceOrder(
      {
        currency: "GBP",
        date_created_gmt: "2026-07-02T12:00:00",
        id: 1205,
        line_items: [
          {
            id: 501,
            name: "Trail Shoe",
            product_id: 9001,
            quantity: 2,
            sku: "SHOE-TRAIL-9",
            subtotal: "70.00",
            total: "70.00",
            total_tax: "11.67",
          },
        ],
        number: "WC-1205",
        refunds: [{ id: 44, reason: "Customer return", total: "10.00" }],
        status: "processing",
        total: "74.99",
      },
      context,
    );

    await expect(service.persistOrderTree(orderTree)).resolves.toEqual({ orderItems: 1, refunds: 1 });

    expect(commerceOrderUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          connectedStoreId_platformOrderId: {
            connectedStoreId: "store_1",
            platformOrderId: "1205",
          },
        },
        create: expect.objectContaining({
          businessId: "business_1",
          connectedStoreId: "store_1",
          currency: "GBP",
          platform: IntegrationPlatform.WooCommerce,
          platformOrderId: "1205",
          sourceMetadata: orderTree.order.sourceMetadata,
          totalAmount: "74.99",
        }),
        update: expect.not.objectContaining({
          businessId: expect.anything(),
          connectedStoreId: expect.anything(),
          platform: expect.anything(),
          platformOrderId: expect.anything(),
        }),
      }),
    );
    expect(commerceOrderItemUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          commerceOrderId_platformOrderItemId: {
            commerceOrderId: "order_db_1",
            platformOrderItemId: "501",
          },
        },
        create: expect.objectContaining({
          commerceOrderId: "order_db_1",
          platformProductId: "9001",
          sourceMetadata: orderTree.items[0]?.sourceMetadata,
        }),
      }),
    );
    expect(commerceRefundUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          commerceOrderId: "order_db_1",
          platformOrderId: "1205",
          platformRefundId: "44",
          sourceMetadata: orderTree.refunds[0]?.sourceMetadata,
        }),
      }),
    );
  });

  it("persists products idempotently by connected store and platform product ID", async () => {
    const { service, commerceProductUpsert } = createServiceMocks();
    const product = mapWooCommerceProduct(
      {
        id: 9001,
        name: "Trail Shoe",
        price: "35.00",
        regular_price: "45.00",
        sale_price: "35.00",
        sku: "SHOE-TRAIL-9",
        status: "publish",
        stock_quantity: 14,
        stock_status: "instock",
        type: "variable",
      },
      { ...context, currency: "GBP" },
    );

    await service.persistProduct(product);
    await service.persistProduct(product);

    expect(commerceProductUpsert).toHaveBeenCalledTimes(2);
    expect(commerceProductUpsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          connectedStoreId_platformProductId: {
            connectedStoreId: "store_1",
            platformProductId: "9001",
          },
        },
        create: expect.objectContaining({
          currency: "GBP",
          platform: IntegrationPlatform.WooCommerce,
          priceAmount: "35.00",
          sourceMetadata: product.sourceMetadata,
        }),
        update: expect.not.objectContaining({ platform: expect.anything() }),
      }),
    );
  });

  it("persists customers by platform-scoped customer identity", async () => {
    const { service, commerceCustomerUpsert } = createServiceMocks();
    const customer = mapWooCommerceCustomer(
      {
        email: "buyer@example.com",
        first_name: "Ada",
        id: 77,
        last_name: "Lovelace",
        role: "customer",
        username: "ada77",
      },
      context,
    );

    await service.persistCustomer(customer);

    expect(commerceCustomerUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          connectedStoreId_platformCustomerId: {
            connectedStoreId: "store_1",
            platformCustomerId: "77",
          },
        },
        create: expect.objectContaining({
          email: "buyer@example.com",
          platform: IntegrationPlatform.WooCommerce,
          sourceMetadata: customer.sourceMetadata,
        }),
      }),
    );
  });

  it("persists inventory snapshots by product and capture time", async () => {
    const { service, commerceInventorySnapshotUpsert } = createServiceMocks();
    const capturedAt = new Date("2026-07-03T10:00:00.000Z");
    const snapshot = mapWooCommerceInventorySnapshot(
      {
        id: 9001,
        manage_stock: true,
        sku: "SHOE-TRAIL-9",
        stock_quantity: 14,
        stock_status: "instock",
      },
      { ...context, capturedAt },
    );

    await service.persistInventorySnapshot(snapshot);

    expect(commerceInventorySnapshotUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          connectedStoreId_platformProductId_capturedAt: {
            capturedAt,
            connectedStoreId: "store_1",
            platformProductId: "9001",
          },
        },
        create: expect.objectContaining({
          platform: IntegrationPlatform.WooCommerce,
          sourceMetadata: snapshot.sourceMetadata,
          stockQuantity: 14,
        }),
      }),
    );
  });

  it("persists categories with platform parent IDs", async () => {
    const { service, commerceCategoryUpsert } = createServiceMocks();
    const category = mapWooCommerceCategory(
      { count: 42, id: 12, name: "Shoes", parent: 3, slug: "shoes" },
      context,
    );

    await service.persistCategory(category);

    expect(commerceCategoryUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          connectedStoreId_platformCategoryId: {
            connectedStoreId: "store_1",
            platformCategoryId: "12",
          },
        },
        create: expect.objectContaining({
          platformParentCategoryId: "3",
          sourceMetadata: category.sourceMetadata,
        }),
      }),
    );
  });

  it("persists standalone refunds by resolving their local order when available", async () => {
    const { service, commerceOrderFindUnique, commerceRefundUpsert } = createServiceMocks();
    commerceOrderFindUnique.mockResolvedValue({ id: "order_db_1" });
    const refund = mapWooCommerceRefund(
      {
        amount: "12.34",
        date_created_gmt: "2026-07-03T07:00:00",
        id: 909,
        reason: "Damaged parcel",
        status: "completed",
      },
      { ...context, currency: "GBP", platformOrderId: "1205" },
    );

    await service.persistRefund(refund);

    expect(commerceOrderFindUnique).toHaveBeenCalledWith({
      where: {
        connectedStoreId_platformOrderId: {
          connectedStoreId: "store_1",
          platformOrderId: "1205",
        },
      },
      select: { id: true },
    });
    expect(commerceRefundUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          connectedStoreId_platformRefundId: {
            connectedStoreId: "store_1",
            platformRefundId: "909",
          },
        },
        create: expect.objectContaining({
          amount: "12.34",
          commerceOrderId: "order_db_1",
          currency: "GBP",
          sourceMetadata: refund.sourceMetadata,
        }),
      }),
    );
  });

  it("persists a batch and updates connected store sync time to the latest record", async () => {
    const { service, connectedStoreUpdate } = createServiceMocks();
    const laterSyncedAt = new Date("2026-07-03T11:00:00.000Z");
    const orderTree = mapWooCommerceOrder({ id: 1205 }, context);
    const product = mapWooCommerceProduct(
      { id: 9001 },
      { ...context, lastSyncedAt: laterSyncedAt },
    );

    await expect(
      service.persistCommerceData({ orders: [orderTree], products: [product] }),
    ).resolves.toEqual({
      categories: 0,
      customers: 0,
      inventorySnapshots: 0,
      orderItems: 0,
      orders: 1,
      products: 1,
      refunds: 0,
    });

    expect(connectedStoreUpdate).toHaveBeenLastCalledWith({
      where: { id: "store_1" },
      data: { lastSynchronisedAt: laterSyncedAt },
    });
  });
});
