import { ConflictException, NotFoundException } from "@nestjs/common";
import { TikTokShopApiRegion } from "@salense/integrations";
import type { PrismaService } from "../../database/prisma.service.js";
import type { AesCredentialEncryptionService } from "../security/credential-encryption.service.js";
import type { CommerceSyncCursorService } from "../sync-cursors/commerce-sync-cursor.service.js";
import { CommerceSyncCursorResource } from "../sync-cursors/commerce-sync-cursor.types.js";
import {
  type TikTokShopReadClient,
  TikTokShopSyncService,
} from "../tiktok-shop-sync.service.js";
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
    region: TikTokShopApiRegion.Europe,
    shopCipher: "shop_cipher_123",
    shopId: "shop_123",
  },
  businessId: "business_1",
  connectionStatus: StoreConnectionStatus.Connected,
  id: "store_tiktok_1",
  platform: StorePlatform.TikTokShop,
  refreshTokenMetadata: { encryptedCredential: encryptedRefreshToken },
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

function createServiceMocks(store: typeof connectedStore | null = connectedStore) {
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

  return {
    decrypt,
    findFirstConnectedStore,
    getCursor,
    persistCommerceData,
    readClient: readClient as TikTokShopReadClient,
    recordCursorFailure,
    recordCursorSuccess,
    service: new TikTokShopSyncService(
      prismaService,
      { decrypt } as unknown as AesCredentialEncryptionService,
      { persistCommerceData } as unknown as WooCommerceCommercePersistenceService,
      readClient as TikTokShopReadClient,
      {
        getCursor,
        recordFailure: recordCursorFailure,
        recordSuccess: recordCursorSuccess,
      } as unknown as CommerceSyncCursorService,
    ),
    updateConnectedStore,
  };
}

describe("TikTokShopSyncService", () => {
  it("requires a connected TikTok Shop store", async () => {
    const missing = createServiceMocks(null);

    await expect(missing.service.syncOrders("missing_store")).rejects.toThrow(NotFoundException);
    expect(missing.readClient.listOrders).not.toHaveBeenCalled();

    const disconnected = createServiceMocks({
      ...connectedStore,
      connectionStatus: StoreConnectionStatus.Disconnected,
    });

    await expect(disconnected.service.syncOrders("store_tiktok_1")).rejects.toThrow(
      ConflictException,
    );
  });

  it("decrypts credentials before calling the TikTok Shop read client", async () => {
    const { service, decrypt, getCursor, readClient } = createServiceMocks();
    const since = new Date("2026-07-01T00:00:00.000Z");

    await service.syncOrders("store_tiktok_1", { maxPages: 2, pageSize: 50, since });

    expect(getCursor).toHaveBeenCalledWith("store_tiktok_1", CommerceSyncCursorResource.Orders);
    expect(decrypt).toHaveBeenCalledWith(encryptedAccessToken);
    expect(decrypt).toHaveBeenCalledWith(encryptedRefreshToken);
    expect(readClient.listOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: "access-token",
        maxPages: 2,
        pageSize: 50,
        region: TikTokShopApiRegion.Europe,
        shopCipher: "shop_cipher_123",
        shopId: "shop_123",
        since,
      }),
    );
  });

  it("syncs orders by mapping and persisting normalized order trees", async () => {
    const {
      service,
      readClient,
      persistCommerceData,
      recordCursorSuccess,
      updateConnectedStore,
    } = createServiceMocks();
    const triggeredAt = new Date("2026-07-03T12:00:00.000Z");
    jest.mocked(readClient.listOrders).mockResolvedValue([
      {
        id: "tt_order_1",
        line_items: [{ id: "line_1", product_id: "product_1" }],
        payment: { total_amount: { amount: "35.00", currency: "GBP" } },
      },
    ]);
    persistCommerceData.mockResolvedValue({ ...emptyPersistenceResult, orderItems: 1, orders: 1 });

    await expect(service.syncOrders("store_tiktok_1", { triggeredAt })).resolves.toMatchObject({
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
          items: [expect.objectContaining({ platformOrderItemId: "line_1" })],
          order: expect.objectContaining({
            businessId: "business_1",
            connectedStoreId: "store_tiktok_1",
            platformOrderId: "tt_order_1",
            totalAmount: "35.00",
          }),
        }),
      ],
    });
    expect(updateConnectedStore).toHaveBeenCalledWith({
      where: { id: "store_tiktok_1" },
      data: { lastSynchronisedAt: triggeredAt },
    });
    expect(recordCursorSuccess).toHaveBeenCalledWith({
      businessId: "business_1",
      connectedStoreId: "store_tiktok_1",
      platform: StorePlatform.TikTokShop,
      resource: CommerceSyncCursorResource.Orders,
      syncedAt: triggeredAt,
    });
  });
});
