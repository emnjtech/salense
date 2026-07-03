import { ConflictException, NotFoundException } from "@nestjs/common";
import { WooCommerceApiVersion } from "@salense/integrations";
import type { PrismaService } from "../../database/prisma.service.js";
import type { AesCredentialEncryptionService } from "../security/credential-encryption.service.js";
import type { CommerceSyncCursorService } from "../sync-cursors/commerce-sync-cursor.service.js";
import {
  CommerceSyncCursorResource,
  CommerceSyncCursorStatus,
} from "../sync-cursors/commerce-sync-cursor.types.js";
import { StoreConnectionStatus } from "../types/store-connection-status.enum.js";
import { StorePlatform } from "../types/store-platform.enum.js";
import type { WooCommerceCommercePersistenceService } from "../woocommerce-commerce-persistence.service.js";
import {
  type WooCommerceReadClient,
  WooCommerceSyncService,
} from "../woocommerce-sync.service.js";

const encryptedConsumerKey = {
  algorithm: "aes-256-gcm" as const,
  authTag: "auth-tag-key",
  ciphertext: "encrypted-key",
  iv: "iv-key",
  keyId: "test-key",
};
const encryptedConsumerSecret = {
  algorithm: "aes-256-gcm" as const,
  authTag: "auth-tag-secret",
  ciphertext: "encrypted-secret",
  iv: "iv-secret",
  keyId: "test-key",
};
const connectedStore = {
  accessTokenMetadata: {
    apiVersion: WooCommerceApiVersion.WcV3,
    encryptedCredential: encryptedConsumerKey,
  },
  businessId: "business_1",
  connectionStatus: StoreConnectionStatus.Connected,
  id: "store_1",
  platform: StorePlatform.WooCommerce,
  refreshTokenMetadata: {
    apiVersion: WooCommerceApiVersion.WcV3,
    encryptedCredential: encryptedConsumerSecret,
  },
  storeUrl: "https://shop.example.com",
};
const emptyPersistenceResult = {
  categories: 0,
  customers: 0,
  inventorySnapshots: 0,
  orderItems: 0,
  orders: 0,
  products: 0,
  refunds: 0,
};

function createServiceMocks(store: typeof connectedStore | null = connectedStore): {
  readonly service: WooCommerceSyncService;
  readonly findFirstConnectedStore: jest.Mock;
  readonly updateConnectedStore: jest.Mock;
  readonly decrypt: jest.Mock;
  readonly getCursor: jest.Mock;
  readonly persistCommerceData: jest.Mock;
  readonly recordCursorFailure: jest.Mock;
  readonly recordCursorSuccess: jest.Mock;
  readonly readClient: WooCommerceReadClient & {
    readonly createOrder: jest.Mock;
    readonly deleteProduct: jest.Mock;
    readonly updateInventory: jest.Mock;
  };
} {
  const findFirstConnectedStore = jest.fn().mockResolvedValue(store);
  const updateConnectedStore = jest.fn();
  const getCursor = jest.fn().mockResolvedValue(null);
  const recordCursorSuccess = jest.fn().mockResolvedValue(undefined);
  const recordCursorFailure = jest.fn().mockResolvedValue(undefined);
  const decrypt = jest.fn((credential: typeof encryptedConsumerKey) =>
    credential.ciphertext === "encrypted-key" ? "ck_live" : "cs_live",
  );
  const persistCommerceData = jest.fn().mockResolvedValue(emptyPersistenceResult);
  const readClient = {
    createOrder: jest.fn(),
    deleteProduct: jest.fn(),
    listCustomers: jest.fn().mockResolvedValue([]),
    listInventoryProducts: jest.fn().mockResolvedValue([]),
    listOrders: jest.fn().mockResolvedValue([]),
    listProductCategories: jest.fn().mockResolvedValue([]),
    listProducts: jest.fn().mockResolvedValue([]),
    listRefunds: jest.fn().mockResolvedValue([]),
    updateInventory: jest.fn(),
  } as WooCommerceReadClient & {
    readonly createOrder: jest.Mock;
    readonly deleteProduct: jest.Mock;
    readonly updateInventory: jest.Mock;
  };
  const prismaService = {
    client: {
      connectedStore: {
        findFirst: findFirstConnectedStore,
        update: updateConnectedStore,
      },
    },
  } as unknown as PrismaService;
  const credentialEncryption = { decrypt } as unknown as AesCredentialEncryptionService;
  const persistenceService = {
    persistCommerceData,
  } as unknown as WooCommerceCommercePersistenceService;
  const syncCursorService = {
    getCursor,
    recordFailure: recordCursorFailure,
    recordSuccess: recordCursorSuccess,
  } as unknown as CommerceSyncCursorService;

  return {
    service: new WooCommerceSyncService(
      prismaService,
      credentialEncryption,
      persistenceService,
      readClient,
      syncCursorService,
    ),
    decrypt,
    findFirstConnectedStore,
    getCursor,
    persistCommerceData,
    readClient,
    recordCursorFailure,
    recordCursorSuccess,
    updateConnectedStore,
  };
}

describe("WooCommerceSyncService", () => {
  it("requires a connected WooCommerce store", async () => {
    const missing = createServiceMocks(null);

    await expect(missing.service.syncOrders("missing_store")).rejects.toThrow(NotFoundException);
    expect(missing.readClient.listOrders).not.toHaveBeenCalled();

    const disconnected = createServiceMocks({
      ...connectedStore,
      connectionStatus: StoreConnectionStatus.Disconnected,
    });

    await expect(disconnected.service.syncOrders("store_1")).rejects.toThrow(ConflictException);
    expect(disconnected.readClient.listOrders).not.toHaveBeenCalled();
  });

  it("decrypts credentials before calling the WooCommerce read client", async () => {
    const { service, decrypt, getCursor, readClient } = createServiceMocks();
    const since = new Date("2026-07-01T00:00:00.000Z");

    await service.syncOrders("store_1", { maxPages: 2, perPage: 50, since });

    expect(getCursor).toHaveBeenCalledWith("store_1", CommerceSyncCursorResource.Orders);
    expect(decrypt).toHaveBeenCalledWith(encryptedConsumerKey);
    expect(decrypt).toHaveBeenCalledWith(encryptedConsumerSecret);
    expect(readClient.listOrders).toHaveBeenCalledWith({
      apiVersion: WooCommerceApiVersion.WcV3,
      consumerKey: "ck_live",
      consumerSecret: "cs_live",
      maxPages: 2,
      perPage: 50,
      since,
      storeUrl: "https://shop.example.com",
    });
  });

  it("syncs orders by reading, mapping, and persisting normalized order trees", async () => {
    const {
      service,
      readClient,
      persistCommerceData,
      updateConnectedStore,
      getCursor,
      recordCursorSuccess,
    } = createServiceMocks();
    const triggeredAt = new Date("2026-07-03T12:00:00.000Z");
    jest.mocked(readClient.listOrders).mockResolvedValue([
      {
        currency: "GBP",
        id: 1205,
        line_items: [{ id: 501, product_id: 9001, total: "35.00" }],
        refunds: [{ id: 44, total: "5.00" }],
        total: "35.00",
      },
    ]);
    persistCommerceData.mockResolvedValue({ ...emptyPersistenceResult, orderItems: 1, orders: 1, refunds: 1 });

    await expect(service.syncOrders("store_1", { triggeredAt })).resolves.toMatchObject({
      errors: [],
      persistence: { orderItems: 1, orders: 1, refunds: 1 },
      readOnly: true,
      resource: "orders",
      status: "SUCCESS",
      syncedAt: triggeredAt,
    });
    expect(persistCommerceData).toHaveBeenCalledWith({
      orders: [
        expect.objectContaining({
          items: [expect.objectContaining({ platformOrderItemId: "501", platformProductId: "9001" })],
          order: expect.objectContaining({
            businessId: "business_1",
            connectedStoreId: "store_1",
            platformOrderId: "1205",
            totalAmount: "35.00",
          }),
          refunds: [expect.objectContaining({ platformRefundId: "44" })],
        }),
      ],
    });
    expect(updateConnectedStore).toHaveBeenCalledWith({
      where: { id: "store_1" },
      data: { lastSynchronisedAt: triggeredAt },
    });
    expect(getCursor).toHaveBeenCalledWith("store_1", CommerceSyncCursorResource.Orders);
    expect(readClient.listOrders).toHaveBeenCalledWith(
      expect.not.objectContaining({ since: expect.any(Date) }),
    );
    expect(recordCursorSuccess).toHaveBeenCalledWith({
      businessId: "business_1",
      connectedStoreId: "store_1",
      platform: StorePlatform.WooCommerce,
      resource: CommerceSyncCursorResource.Orders,
      syncedAt: triggeredAt,
    });
  });

  it("uses the previous successful cursor for later incremental syncs", async () => {
    const { service, getCursor, readClient } = createServiceMocks();
    const lastSuccessfulSyncedAt = new Date("2026-07-02T09:00:00.000Z");
    getCursor.mockResolvedValue({
      businessId: "business_1",
      connectedStoreId: "store_1",
      errorMetadata: null,
      lastAttemptedSyncedAt: lastSuccessfulSyncedAt,
      lastSuccessfulSyncedAt,
      platform: StorePlatform.WooCommerce,
      resource: CommerceSyncCursorResource.Products,
      status: CommerceSyncCursorStatus.Success,
    });

    await service.syncProducts("store_1");

    expect(readClient.listProducts).toHaveBeenCalledWith(
      expect.objectContaining({ since: lastSuccessfulSyncedAt }),
    );
  });

  it("supports product, customer, inventory, category, and refund resource syncs", async () => {
    const { service, readClient, persistCommerceData } = createServiceMocks();
    const triggeredAt = new Date("2026-07-03T12:30:00.000Z");
    jest.mocked(readClient.listProducts).mockResolvedValue([{ id: 9001, name: "Trail Shoe" }]);
    jest.mocked(readClient.listCustomers).mockResolvedValue([{ email: "buyer@example.com", id: 77 }]);
    jest.mocked(readClient.listInventoryProducts).mockResolvedValue([
      { id: 9001, stock_quantity: 14, stock_status: "instock" },
    ]);
    jest.mocked(readClient.listProductCategories).mockResolvedValue([{ id: 12, name: "Shoes" }]);
    jest.mocked(readClient.listRefunds).mockResolvedValue([{ amount: "7.50", id: 909 }]);

    await service.syncProducts("store_1", { triggeredAt });
    await service.syncCustomers("store_1", { triggeredAt });
    await service.syncInventory("store_1", { triggeredAt });
    await service.syncCategories("store_1", { triggeredAt });
    await service.syncRefunds("store_1", { triggeredAt });

    expect(persistCommerceData).toHaveBeenNthCalledWith(1, {
      products: [expect.objectContaining({ name: "Trail Shoe", platformProductId: "9001" })],
    });
    expect(persistCommerceData).toHaveBeenNthCalledWith(2, {
      customers: [expect.objectContaining({ email: "buyer@example.com", platformCustomerId: "77" })],
    });
    expect(persistCommerceData).toHaveBeenNthCalledWith(3, {
      inventorySnapshots: [expect.objectContaining({ platformProductId: "9001", stockQuantity: 14 })],
    });
    expect(persistCommerceData).toHaveBeenNthCalledWith(4, {
      categories: [expect.objectContaining({ name: "Shoes", platformCategoryId: "12" })],
    });
    expect(persistCommerceData).toHaveBeenNthCalledWith(5, {
      refunds: [expect.objectContaining({ amount: "7.50", platformRefundId: "909" })],
    });
  });

  it("returns structured error results when a resource sync fails", async () => {
    const { service, readClient, persistCommerceData, recordCursorFailure } = createServiceMocks();
    const triggeredAt = new Date("2026-07-03T12:45:00.000Z");
    jest
      .mocked(readClient.listProducts)
      .mockRejectedValue(new Error("WooCommerce rate limit exceeded with ck_live secret."));

    await expect(service.syncProducts("store_1", { triggeredAt })).resolves.toMatchObject({
      errors: ["WooCommerce rate limit exceeded with ck_live secret."],
      persistence: emptyPersistenceResult,
      readOnly: true,
      resource: "products",
      status: "ERROR",
    });
    expect(persistCommerceData).not.toHaveBeenCalled();
    expect(recordCursorFailure).toHaveBeenCalledWith({
      attemptedAt: triggeredAt,
      businessId: "business_1",
      connectedStoreId: "store_1",
      error: expect.any(Error),
      platform: StorePlatform.WooCommerce,
      resource: CommerceSyncCursorResource.Products,
    });
    expect(JSON.stringify(recordCursorFailure.mock.calls)).not.toContain("encrypted-key");
    expect(JSON.stringify(recordCursorFailure.mock.calls)).not.toContain("encrypted-secret");
  });

  it("does not pass cursor dates to category reads because WooCommerce category filtering is unsupported", async () => {
    const { service, getCursor, readClient, recordCursorSuccess } = createServiceMocks();
    const lastSuccessfulSyncedAt = new Date("2026-07-02T09:00:00.000Z");
    const triggeredAt = new Date("2026-07-03T12:50:00.000Z");
    getCursor.mockResolvedValue({
      businessId: "business_1",
      connectedStoreId: "store_1",
      errorMetadata: null,
      lastAttemptedSyncedAt: lastSuccessfulSyncedAt,
      lastSuccessfulSyncedAt,
      platform: StorePlatform.WooCommerce,
      resource: CommerceSyncCursorResource.Categories,
      status: CommerceSyncCursorStatus.Success,
    });

    await service.syncCategories("store_1", { triggeredAt });

    expect(readClient.listProductCategories).toHaveBeenCalledWith(
      expect.not.objectContaining({ since: expect.any(Date) }),
    );
    expect(recordCursorSuccess).toHaveBeenCalledWith({
      businessId: "business_1",
      connectedStoreId: "store_1",
      platform: StorePlatform.WooCommerce,
      resource: CommerceSyncCursorResource.Categories,
      syncedAt: triggeredAt,
    });
  });

  it("runs manual full sync sequentially and reports counts and errors", async () => {
    const { service, readClient, persistCommerceData } = createServiceMocks();
    const triggeredAt = new Date("2026-07-03T13:00:00.000Z");
    jest.mocked(readClient.listOrders).mockResolvedValue([{ id: 1 }]);
    jest.mocked(readClient.listProducts).mockRejectedValue(new Error("products failed"));
    persistCommerceData.mockResolvedValue(emptyPersistenceResult);

    await expect(service.syncAll("store_1", { triggeredAt })).resolves.toMatchObject({
      connectedStoreId: "store_1",
      errors: ["products failed"],
      readOnly: true,
      status: "PARTIAL_FAILURE",
      syncedAt: triggeredAt,
    });
    expect(readClient.listOrders).toHaveBeenCalledTimes(1);
    expect(readClient.listProducts).toHaveBeenCalledTimes(1);
    expect(readClient.listCustomers).toHaveBeenCalledTimes(1);
    expect(readClient.listInventoryProducts).toHaveBeenCalledTimes(1);
    expect(readClient.listProductCategories).toHaveBeenCalledTimes(1);
    expect(readClient.listRefunds).toHaveBeenCalledTimes(1);
  });

  it("never calls WooCommerce write-style client methods", async () => {
    const { service, readClient } = createServiceMocks();

    await service.syncAll("store_1");

    expect(readClient.createOrder).not.toHaveBeenCalled();
    expect(readClient.updateInventory).not.toHaveBeenCalled();
    expect(readClient.deleteProduct).not.toHaveBeenCalled();
  });
});
