import { ConflictException, NotFoundException } from "@nestjs/common";
import { AmazonSellerApiRegion } from "@salense/integrations";
import type { PrismaService } from "../../database/prisma.service.js";
import {
  type AmazonSellerReadClient,
  AmazonSellerSyncService,
} from "../amazon-seller-sync.service.js";
import type { AesCredentialEncryptionService } from "../security/credential-encryption.service.js";
import type { CommerceSyncCursorService } from "../sync-cursors/commerce-sync-cursor.service.js";
import {
  CommerceSyncCursorResource,
  CommerceSyncCursorStatus,
} from "../sync-cursors/commerce-sync-cursor.types.js";
import { StoreConnectionStatus } from "../types/store-connection-status.enum.js";
import { StorePlatform } from "../types/store-platform.enum.js";
import type { WooCommerceCommercePersistenceService } from "../woocommerce-commerce-persistence.service.js";

const encryptedAccessToken = {
  algorithm: "aes-256-gcm" as const,
  authTag: "auth-tag-access",
  ciphertext: "encrypted-access",
  iv: "iv-access",
  keyId: "test-key",
};
const encryptedRefreshToken = {
  algorithm: "aes-256-gcm" as const,
  authTag: "auth-tag-refresh",
  ciphertext: "encrypted-refresh",
  iv: "iv-refresh",
  keyId: "test-key",
};
const connectedStore = {
  accessTokenMetadata: {
    encryptedCredential: encryptedAccessToken,
    marketplaceId: "A1F83G8C2ARO7P",
    region: AmazonSellerApiRegion.Europe,
    sellerId: "seller_123",
  },
  businessId: "business_1",
  connectionStatus: StoreConnectionStatus.Connected,
  id: "store_amazon_1",
  platform: StorePlatform.AmazonSeller,
  refreshTokenMetadata: {
    encryptedCredential: encryptedRefreshToken,
  },
  region: "GB",
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
  readonly service: AmazonSellerSyncService;
  readonly decrypt: jest.Mock;
  readonly findFirstConnectedStore: jest.Mock;
  readonly getCursor: jest.Mock;
  readonly persistCommerceData: jest.Mock;
  readonly readClient: AmazonSellerReadClient;
  readonly recordCursorFailure: jest.Mock;
  readonly recordCursorSuccess: jest.Mock;
  readonly updateConnectedStore: jest.Mock;
} {
  const findFirstConnectedStore = jest.fn().mockResolvedValue(store);
  const updateConnectedStore = jest.fn();
  const getCursor = jest.fn().mockResolvedValue(null);
  const recordCursorSuccess = jest.fn().mockResolvedValue(undefined);
  const recordCursorFailure = jest.fn().mockResolvedValue(undefined);
  const decrypt = jest.fn((credential: typeof encryptedAccessToken) =>
    credential.ciphertext === "encrypted-access" ? "access-token" : "refresh-token",
  );
  const persistCommerceData = jest.fn().mockResolvedValue(emptyPersistenceResult);
  const readClient = {
    listInventory: jest.fn().mockResolvedValue([]),
    listOrderItems: jest.fn().mockResolvedValue([]),
    listOrders: jest.fn().mockResolvedValue([]),
    listProducts: jest.fn().mockResolvedValue([]),
    listRefunds: jest.fn().mockResolvedValue([]),
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
    service: new AmazonSellerSyncService(
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

describe("AmazonSellerSyncService", () => {
  it("requires a connected Amazon Seller store", async () => {
    const missing = createServiceMocks(null);

    await expect(missing.service.syncOrders("missing_store")).rejects.toThrow(NotFoundException);
    expect(missing.readClient.listOrders).not.toHaveBeenCalled();

    const disconnected = createServiceMocks({
      ...connectedStore,
      connectionStatus: StoreConnectionStatus.Disconnected,
    });

    await expect(disconnected.service.syncOrders("store_amazon_1")).rejects.toThrow(
      ConflictException,
    );
    expect(disconnected.readClient.listOrders).not.toHaveBeenCalled();
  });

  it("decrypts credentials before calling the Amazon Seller read client", async () => {
    const { service, decrypt, getCursor, readClient } = createServiceMocks();
    const since = new Date("2026-07-01T00:00:00.000Z");

    await service.syncOrders("store_amazon_1", { maxPages: 2, pageSize: 50, since });

    expect(getCursor).toHaveBeenCalledWith("store_amazon_1", CommerceSyncCursorResource.Orders);
    expect(decrypt).toHaveBeenCalledWith(encryptedAccessToken);
    expect(decrypt).toHaveBeenCalledWith(encryptedRefreshToken);
    expect(readClient.listOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: "access-token",
        marketplaceId: "A1F83G8C2ARO7P",
        maxPages: 2,
        pageSize: 50,
        region: AmazonSellerApiRegion.Europe,
        sellerId: "seller_123",
        since,
      }),
    );
  });

  it("syncs orders by reading, mapping, and persisting normalized order trees", async () => {
    const {
      service,
      readClient,
      persistCommerceData,
      updateConnectedStore,
      recordCursorSuccess,
    } = createServiceMocks();
    const triggeredAt = new Date("2026-07-03T12:00:00.000Z");
    jest.mocked(readClient.listOrders).mockResolvedValue([
      {
        AmazonOrderId: "026-1234567-1234567",
        OrderTotal: { Amount: "35.00", CurrencyCode: "GBP" },
        PurchaseDate: "2026-07-02T12:00:00Z",
      },
    ]);
    jest.mocked(readClient.listOrderItems).mockResolvedValue([
      {
        ASIN: "B000TEST",
        OrderItemId: "item_1",
        QuantityOrdered: 1,
        SellerSKU: "AMZ-SKU-1",
      },
    ]);
    persistCommerceData.mockResolvedValue({ ...emptyPersistenceResult, orderItems: 1, orders: 1 });

    await expect(service.syncOrders("store_amazon_1", { triggeredAt })).resolves.toMatchObject({
      errors: [],
      persistence: { orderItems: 1, orders: 1 },
      readOnly: true,
      resource: "orders",
      status: "SUCCESS",
      syncedAt: triggeredAt,
    });
    expect(persistCommerceData).toHaveBeenCalledWith({
      orders: [
        expect.objectContaining({
          items: [expect.objectContaining({ platformOrderItemId: "item_1" })],
          order: expect.objectContaining({
            businessId: "business_1",
            connectedStoreId: "store_amazon_1",
            platformOrderId: "026-1234567-1234567",
            totalAmount: "35.00",
          }),
        }),
      ],
    });
    expect(updateConnectedStore).toHaveBeenCalledWith({
      where: { id: "store_amazon_1" },
      data: { lastSynchronisedAt: triggeredAt },
    });
    expect(recordCursorSuccess).toHaveBeenCalledWith({
      businessId: "business_1",
      connectedStoreId: "store_amazon_1",
      platform: StorePlatform.AmazonSeller,
      resource: CommerceSyncCursorResource.Orders,
      syncedAt: triggeredAt,
    });
  });

  it("uses the previous successful cursor for incremental product syncs", async () => {
    const { service, getCursor, readClient } = createServiceMocks();
    const lastSuccessfulSyncedAt = new Date("2026-07-02T09:00:00.000Z");
    getCursor.mockResolvedValue({
      businessId: "business_1",
      connectedStoreId: "store_amazon_1",
      errorMetadata: null,
      lastAttemptedSyncedAt: lastSuccessfulSyncedAt,
      lastSuccessfulSyncedAt,
      platform: StorePlatform.AmazonSeller,
      resource: CommerceSyncCursorResource.Products,
      status: CommerceSyncCursorStatus.Success,
    });

    await service.syncProducts("store_amazon_1");

    expect(readClient.listProducts).toHaveBeenCalledWith(
      expect.objectContaining({ since: lastSuccessfulSyncedAt }),
    );
  });
});
