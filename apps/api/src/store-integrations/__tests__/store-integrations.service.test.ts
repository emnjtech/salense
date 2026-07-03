import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  NotImplementedException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  IntegrationAuthenticationError,
  IntegrationNotImplementedError,
  IntegrationPlatform,
  WooCommerceApiVersion,
  type IntegrationFactory,
} from "@salense/integrations";
import type { AuditLogService } from "../../audit/audit-log.service.js";
import { AuditAction, AuditLogModule, AuditLogResult } from "../../audit/types/audit-log.type.js";
import type { PrismaService } from "../../database/prisma.service.js";
import type { AesCredentialEncryptionService } from "../security/credential-encryption.service.js";
import { StoreIntegrationsService } from "../store-integrations.service.js";
import {
  CommerceSyncCursorResource,
  CommerceSyncCursorStatus,
} from "../sync-cursors/commerce-sync-cursor.types.js";
import type { WooCommerceSyncSchedulingService } from "../sync-queue/woocommerce-sync-scheduling.service.js";
import { WooCommerceSyncJobName, type SyncQueuePort } from "../sync-queue/sync-queue.types.js";
import { StoreConnectionStatus } from "../types/store-connection-status.enum.js";
import { StorePlatform } from "../types/store-platform.enum.js";

function createStoreIntegrationsServiceMocks(): {
  readonly service: StoreIntegrationsService;
  readonly findBusiness: jest.Mock;
  readonly findManyConnectedStores: jest.Mock;
  readonly findFirstConnectedStore: jest.Mock;
  readonly createConnectedStore: jest.Mock;
  readonly updateConnectedStore: jest.Mock;
  readonly getProvider: jest.Mock;
  readonly connect: jest.Mock;
  readonly validateConnection: jest.Mock;
  readonly disconnect: jest.Mock;
  readonly synchroniseOrders: jest.Mock;
  readonly enqueueWooCommerceSyncJob: jest.Mock;
  readonly getJobStatus: jest.Mock;
  readonly getWooCommerceStoreJobStatuses: jest.Mock;
  readonly findManySyncCursors: jest.Mock;
  readonly scheduleAutomaticSync: jest.Mock;
  readonly removeAutomaticSync: jest.Mock;
  readonly recordAuditLog: jest.Mock;
  readonly deleteCommerceOrders: jest.Mock;
  readonly deleteCommerceProducts: jest.Mock;
  readonly deleteCommerceCustomers: jest.Mock;
  readonly deleteCommerceInventorySnapshots: jest.Mock;
  readonly deleteCommerceCategories: jest.Mock;
  readonly deleteCommerceRefunds: jest.Mock;
  readonly encrypt: jest.Mock;
} {
  const findBusiness = jest.fn();
  const findManyConnectedStores = jest.fn();
  const findFirstConnectedStore = jest.fn();
  const createConnectedStore = jest.fn();
  const updateConnectedStore = jest.fn();
  const connect = jest.fn();
  const validateConnection = jest.fn();
  const disconnect = jest.fn();
  const synchroniseOrders = jest.fn();
  const enqueueWooCommerceSyncJob = jest.fn();
  const getJobStatus = jest.fn();
  const getWooCommerceStoreJobStatuses = jest.fn().mockResolvedValue([]);
  const findManySyncCursors = jest.fn().mockResolvedValue([]);
  const scheduleAutomaticSync = jest.fn();
  const removeAutomaticSync = jest.fn();
  const recordAuditLog = jest.fn().mockResolvedValue(undefined);
  const deleteCommerceOrders = jest.fn();
  const deleteCommerceProducts = jest.fn();
  const deleteCommerceCustomers = jest.fn();
  const deleteCommerceInventorySnapshots = jest.fn();
  const deleteCommerceCategories = jest.fn();
  const deleteCommerceRefunds = jest.fn();
  const getProvider = jest.fn().mockReturnValue({
    connect,
    disconnect,
    synchroniseOrders,
    validateConnection,
  });
  let encryptedCredentialCount = 0;
  const encrypt = jest.fn(() => ({
    algorithm: "aes-256-gcm" as const,
    authTag: `auth-tag-${++encryptedCredentialCount}`,
    ciphertext: `encrypted-${encryptedCredentialCount}`,
    iv: `iv-${encryptedCredentialCount}`,
    keyId: "test-key",
  }));
  const prismaService = {
    client: {
      business: { findUnique: findBusiness },
      connectedStore: {
        findMany: findManyConnectedStores,
        findFirst: findFirstConnectedStore,
        create: createConnectedStore,
        update: updateConnectedStore,
      },
      commerceSyncCursor: { findMany: findManySyncCursors },
      commerceOrder: { deleteMany: deleteCommerceOrders },
      commerceProduct: { deleteMany: deleteCommerceProducts },
      commerceCustomer: { deleteMany: deleteCommerceCustomers },
      commerceInventorySnapshot: { deleteMany: deleteCommerceInventorySnapshots },
      commerceCategory: { deleteMany: deleteCommerceCategories },
      commerceRefund: { deleteMany: deleteCommerceRefunds },
    },
  } as unknown as PrismaService;
  const integrationFactory = { getProvider } as unknown as IntegrationFactory;
  const credentialEncryption = { encrypt } as unknown as AesCredentialEncryptionService;
  const syncQueue = {
    enqueueWooCommerceSyncJob,
    getJobStatus,
    getWooCommerceStoreJobStatuses,
  } as unknown as SyncQueuePort;
  const syncSchedulingService = {
    removeAutomaticSync,
    scheduleAutomaticSync,
  } as unknown as WooCommerceSyncSchedulingService;
  const auditLogService = { record: recordAuditLog } as unknown as AuditLogService;

  return {
    service: new StoreIntegrationsService(
      prismaService,
      integrationFactory,
      credentialEncryption,
      syncQueue,
      syncSchedulingService,
      auditLogService,
    ),
    findBusiness,
    findManyConnectedStores,
    findFirstConnectedStore,
    createConnectedStore,
    updateConnectedStore,
    getProvider,
    connect,
    validateConnection,
    disconnect,
    encrypt,
    enqueueWooCommerceSyncJob,
    getJobStatus,
    getWooCommerceStoreJobStatuses,
    findManySyncCursors,
    scheduleAutomaticSync,
    removeAutomaticSync,
    recordAuditLog,
    deleteCommerceOrders,
    deleteCommerceProducts,
    deleteCommerceCustomers,
    deleteCommerceInventorySnapshots,
    deleteCommerceCategories,
    deleteCommerceRefunds,
    synchroniseOrders,
  };
}

describe("StoreIntegrationsService", () => {
  it("lists only Version 1 supported platforms", () => {
    const { service } = createStoreIntegrationsServiceMocks();

    expect(service.listSupportedPlatforms()).toEqual([
      {
        platform: StorePlatform.WooCommerce,
        label: "WooCommerce",
        requiresStoreUrl: true,
        requiresRegion: false,
      },
      {
        platform: StorePlatform.AmazonSeller,
        label: "Amazon Seller",
        requiresStoreUrl: false,
        requiresRegion: true,
      },
      {
        platform: StorePlatform.TikTokShop,
        label: "TikTok Shop",
        requiresStoreUrl: false,
        requiresRegion: true,
      },
    ]);
  });

  it("lists connected stores without exposing token hashes or marketplace secrets", async () => {
    const { service, findManyConnectedStores } = createStoreIntegrationsServiceMocks();
    const createdAt = new Date("2026-07-03T10:00:00.000Z");
    const updatedAt = new Date("2026-07-03T10:05:00.000Z");
    findManyConnectedStores.mockResolvedValue([
      {
        id: "store_1",
        businessId: "business_1",
        platform: StorePlatform.WooCommerce,
        storeName: "Main Store",
        storeUrl: "https://shop.example.com",
        region: null,
        connectionStatus: StoreConnectionStatus.Connected,
        lastSynchronisedAt: null,
        createdAt,
        updatedAt,
        accessTokenHash: "hashed-access-token",
        refreshTokenHash: "hashed-refresh-token",
      },
    ]);

    const response = await service.listConnectedStores("user_1");

    expect(response).toEqual([
      {
        id: "store_1",
        businessId: "business_1",
        platform: StorePlatform.WooCommerce,
        storeName: "Main Store",
        storeUrl: "https://shop.example.com",
        region: null,
        connectionStatus: StoreConnectionStatus.Connected,
        lastSynchronisedAt: null,
        createdAt,
        updatedAt,
      },
    ]);
    expect(JSON.stringify(response)).not.toContain("hashed-access-token");
    expect(JSON.stringify(response)).not.toContain("hashed-refresh-token");
    expect(JSON.stringify(response)).not.toContain("password");
  });

  it("rejects unsupported platforms before attempting marketplace auth", async () => {
    const { service, findBusiness, getProvider } = createStoreIntegrationsServiceMocks();

    await expect(
      service.prepareStoreConnection("user_1", {
        platform: "SHOPIFY" as StorePlatform,
        storeName: "Unsupported Store",
      }),
    ).rejects.toThrow(BadRequestException);
    expect(findBusiness).not.toHaveBeenCalled();
    expect(getProvider).not.toHaveBeenCalled();
  });

  it("requires a company profile before preparing a store connection", async () => {
    const { service, findBusiness, findFirstConnectedStore, getProvider } =
      createStoreIntegrationsServiceMocks();
    findBusiness.mockResolvedValue(null);

    await expect(
      service.prepareStoreConnection("user_1", {
        platform: StorePlatform.WooCommerce,
        storeName: "Main Store",
        storeUrl: "https://shop.example.com",
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(findFirstConnectedStore).not.toHaveBeenCalled();
    expect(getProvider).not.toHaveBeenCalled();
  });

  it("enforces the duplicate store connection rule before placeholder auth", async () => {
    const { service, findBusiness, findFirstConnectedStore, getProvider } =
      createStoreIntegrationsServiceMocks();
    findBusiness.mockResolvedValue({ id: "business_1" });
    findFirstConnectedStore.mockResolvedValue({ id: "store_1" });

    await expect(
      service.prepareStoreConnection("user_1", {
        platform: StorePlatform.WooCommerce,
        storeName: "Main Store",
        storeUrl: " https://shop.example.com ",
      }),
    ).rejects.toThrow(ConflictException);
    expect(findFirstConnectedStore).toHaveBeenCalledWith({
      where: {
        businessId: "business_1",
        platform: StorePlatform.WooCommerce,
        storeUrl: "https://shop.example.com",
        region: null,
        disconnectedAt: null,
      },
      select: { id: true },
    });
    expect(getProvider).not.toHaveBeenCalled();
  });

  it("uses the shared integration framework for real platform connection preparation", async () => {
    const { service, findBusiness, findFirstConnectedStore, getProvider, connect } =
      createStoreIntegrationsServiceMocks();
    findBusiness.mockResolvedValue({ id: "business_1" });
    findFirstConnectedStore.mockResolvedValue(null);
    connect.mockRejectedValue(
      new IntegrationNotImplementedError("Amazon Seller connect is not implemented.", {
        platform: IntegrationPlatform.AmazonSeller,
      }),
    );

    await expect(
      service.prepareStoreConnection("user_1", {
        platform: StorePlatform.AmazonSeller,
        storeName: "Amazon UK",
        region: "gb",
      }),
    ).rejects.toThrow(NotImplementedException);
    expect(getProvider).toHaveBeenCalledWith(IntegrationPlatform.AmazonSeller);
    expect(connect).toHaveBeenCalledWith({
      businessId: "business_1",
      platform: IntegrationPlatform.AmazonSeller,
      region: "GB",
      storeName: "Amazon UK",
    });
  });

  it("validates WooCommerce credentials and marks the connection connected", async () => {
    const {
      service,
      findBusiness,
      findFirstConnectedStore,
      createConnectedStore,
      updateConnectedStore,
      getProvider,
      validateConnection,
      encrypt,
      recordAuditLog,
    } =
      createStoreIntegrationsServiceMocks();
    const createdAt = new Date("2026-07-03T11:00:00.000Z");
    const updatedAt = new Date("2026-07-03T11:00:01.000Z");
    findBusiness.mockResolvedValue({ id: "business_1" });
    findFirstConnectedStore.mockResolvedValue(null);
    createConnectedStore.mockResolvedValue({
      id: "store_1",
      businessId: "business_1",
      platform: StorePlatform.WooCommerce,
      storeName: "Main Store",
      storeUrl: "https://shop.example.com",
      region: null,
      connectionStatus: StoreConnectionStatus.PendingValidation,
      lastSynchronisedAt: null,
      createdAt,
      updatedAt,
      accessTokenHash: "stored-key-hash",
      accessTokenMetadata: { encryptedCredential: "stored-key" },
      refreshTokenHash: "stored-secret-hash",
      refreshTokenMetadata: { encryptedCredential: "stored-secret" },
    });
    validateConnection.mockResolvedValue({ status: "HEALTHY", checkedAt: new Date() });
    updateConnectedStore.mockResolvedValue({
      id: "store_1",
      businessId: "business_1",
      platform: StorePlatform.WooCommerce,
      storeName: "Main Store",
      storeUrl: "https://shop.example.com",
      region: null,
      connectionStatus: StoreConnectionStatus.Connected,
      lastSynchronisedAt: null,
      createdAt,
      updatedAt,
    });

    const response = await service.prepareStoreConnection("user_1", {
        platform: StorePlatform.WooCommerce,
        storeName: "Main Store",
        storeUrl: " https://shop.example.com ",
        wooCommerceCredentials: {
          consumerKey: "ck_live_placeholder",
          consumerSecret: "cs_live_placeholder",
          apiVersion: WooCommerceApiVersion.WcV3,
        },
      });

    expect(getProvider).toHaveBeenCalledWith(IntegrationPlatform.WooCommerce);
    expect(encrypt).toHaveBeenCalledWith("ck_live_placeholder");
    expect(encrypt).toHaveBeenCalledWith("cs_live_placeholder");
    expect(createConnectedStore).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accessTokenHash: expect.any(String),
        accessTokenMetadata: expect.objectContaining({
          apiVersion: WooCommerceApiVersion.WcV3,
          credentialKind: "woocommerce_consumer_key",
          encryptedCredential: expect.objectContaining({ ciphertext: "encrypted-1" }),
        }),
        businessId: "business_1",
        connectionStatus: StoreConnectionStatus.PendingValidation,
        platform: IntegrationPlatform.WooCommerce,
        refreshTokenHash: expect.any(String),
        refreshTokenMetadata: expect.objectContaining({
          apiVersion: WooCommerceApiVersion.WcV3,
          credentialKind: "woocommerce_consumer_secret",
          encryptedCredential: expect.objectContaining({ ciphertext: "encrypted-2" }),
        }),
        storeName: "Main Store",
        storeUrl: "https://shop.example.com",
      }),
      select: expect.objectContaining({ id: true }),
    });
    expect(validateConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: "business_1",
        consumerKey: "ck_live_placeholder",
        consumerSecret: "cs_live_placeholder",
        platform: IntegrationPlatform.WooCommerce,
        storeId: "store_1",
        storeUrl: "https://shop.example.com",
      }),
    );
    expect(updateConnectedStore).toHaveBeenCalledWith({
      where: { id: "store_1" },
      data: { connectionStatus: StoreConnectionStatus.Connected },
      select: expect.objectContaining({ id: true }),
    });
    expect(response).toEqual({
      id: "store_1",
      businessId: "business_1",
      platform: StorePlatform.WooCommerce,
      storeName: "Main Store",
      storeUrl: "https://shop.example.com",
      region: null,
      connectionStatus: StoreConnectionStatus.Connected,
      lastSynchronisedAt: null,
      createdAt,
      updatedAt,
    });
    expect(JSON.stringify(response)).not.toContain("ck_live_placeholder");
    expect(JSON.stringify(response)).not.toContain("cs_live_placeholder");
    expect(JSON.stringify(response)).not.toContain("stored-key-hash");
    expect(JSON.stringify(response)).not.toContain("stored-secret-hash");
    expect(JSON.stringify(createConnectedStore.mock.calls)).not.toContain("ck_live_placeholder");
    expect(JSON.stringify(createConnectedStore.mock.calls)).not.toContain("cs_live_placeholder");
    expect(JSON.stringify(response)).not.toContain("encrypted");
    expect(recordAuditLog).toHaveBeenCalledWith({
      action: AuditAction.WooCommerceConnectionCreated,
      affectedModule: AuditLogModule.StoreIntegrations,
      affectedPlatform: StorePlatform.WooCommerce,
      affectedStoreId: "store_1",
      businessId: "business_1",
      metadata: {
        apiVersion: WooCommerceApiVersion.WcV3,
        connectionStatus: StoreConnectionStatus.PendingValidation,
        storeUrl: "https://shop.example.com",
      },
      result: AuditLogResult.Success,
      userId: "user_1",
    });
    expect(recordAuditLog).toHaveBeenCalledWith({
      action: AuditAction.WooCommerceConnectionValidationSucceeded,
      affectedModule: AuditLogModule.StoreIntegrations,
      affectedPlatform: StorePlatform.WooCommerce,
      affectedStoreId: "store_1",
      businessId: "business_1",
      metadata: {
        connectionStatus: StoreConnectionStatus.Connected,
        storeUrl: "https://shop.example.com",
      },
      result: AuditLogResult.Success,
      userId: "user_1",
    });
    expect(JSON.stringify(recordAuditLog.mock.calls)).not.toContain("ck_live_placeholder");
    expect(JSON.stringify(recordAuditLog.mock.calls)).not.toContain("cs_live_placeholder");
    expect(JSON.stringify(recordAuditLog.mock.calls)).not.toContain("stored-key-hash");
    expect(JSON.stringify(recordAuditLog.mock.calls)).not.toContain("encryptedCredential");
  });

  it("marks WooCommerce connection error when credential validation fails", async () => {
    const {
      service,
      findBusiness,
      findFirstConnectedStore,
      createConnectedStore,
      updateConnectedStore,
      validateConnection,
      recordAuditLog,
    } = createStoreIntegrationsServiceMocks();
    const createdAt = new Date("2026-07-03T11:00:00.000Z");
    const updatedAt = new Date("2026-07-03T11:00:01.000Z");
    findBusiness.mockResolvedValue({ id: "business_1" });
    findFirstConnectedStore.mockResolvedValue(null);
    createConnectedStore.mockResolvedValue({
      id: "store_1",
      businessId: "business_1",
      platform: StorePlatform.WooCommerce,
      storeName: "Main Store",
      storeUrl: "https://shop.example.com",
      region: null,
      connectionStatus: StoreConnectionStatus.PendingValidation,
      lastSynchronisedAt: null,
      createdAt,
      updatedAt,
    });
    validateConnection.mockRejectedValue(
      new IntegrationAuthenticationError("WooCommerce authentication failed.", {
        platform: IntegrationPlatform.WooCommerce,
      }),
    );
    updateConnectedStore.mockResolvedValue({
      id: "store_1",
      businessId: "business_1",
      platform: StorePlatform.WooCommerce,
      storeName: "Main Store",
      storeUrl: "https://shop.example.com",
      region: null,
      connectionStatus: StoreConnectionStatus.Error,
      lastSynchronisedAt: null,
      createdAt,
      updatedAt,
    });

    const response = await service.prepareStoreConnection("user_1", {
      platform: StorePlatform.WooCommerce,
      storeName: "Main Store",
      storeUrl: "https://shop.example.com",
      wooCommerceCredentials: {
        consumerKey: "ck_live_placeholder",
        consumerSecret: "cs_live_placeholder",
        apiVersion: WooCommerceApiVersion.WcV3,
      },
    });

    expect(updateConnectedStore).toHaveBeenCalledWith({
      where: { id: "store_1" },
      data: { connectionStatus: StoreConnectionStatus.Error },
      select: expect.objectContaining({ id: true }),
    });
    expect(response.connectionStatus).toBe(StoreConnectionStatus.Error);
    expect(JSON.stringify(response)).not.toContain("ck_live_placeholder");
    expect(JSON.stringify(response)).not.toContain("cs_live_placeholder");
    expect(recordAuditLog).toHaveBeenCalledWith({
      action: AuditAction.WooCommerceConnectionValidationFailed,
      affectedModule: AuditLogModule.StoreIntegrations,
      affectedPlatform: StorePlatform.WooCommerce,
      affectedStoreId: "store_1",
      businessId: "business_1",
      metadata: {
        connectionStatus: StoreConnectionStatus.Error,
        errorName: "IntegrationAuthenticationError",
        storeUrl: "https://shop.example.com",
      },
      result: AuditLogResult.Failure,
      userId: "user_1",
    });
    expect(JSON.stringify(recordAuditLog.mock.calls)).not.toContain("ck_live_placeholder");
    expect(JSON.stringify(recordAuditLog.mock.calls)).not.toContain("cs_live_placeholder");
    expect(JSON.stringify(recordAuditLog.mock.calls)).not.toContain("encryptedCredential");
  });

  it("requires WooCommerce credentials before placeholder connection", async () => {
    const { service, findBusiness, findFirstConnectedStore, getProvider } =
      createStoreIntegrationsServiceMocks();
    findBusiness.mockResolvedValue({ id: "business_1" });
    findFirstConnectedStore.mockResolvedValue(null);

    await expect(
      service.prepareStoreConnection("user_1", {
        platform: StorePlatform.WooCommerce,
        storeName: "Main Store",
        storeUrl: "https://shop.example.com",
      }),
    ).rejects.toThrow(BadRequestException);
    expect(getProvider).not.toHaveBeenCalled();
  });

  it("allows the authenticated owner to disconnect a connected WooCommerce store", async () => {
    const {
      service,
      findFirstConnectedStore,
      updateConnectedStore,
      getProvider,
      disconnect,
      removeAutomaticSync,
      deleteCommerceOrders,
      deleteCommerceProducts,
      deleteCommerceCustomers,
      deleteCommerceInventorySnapshots,
      deleteCommerceCategories,
      deleteCommerceRefunds,
      recordAuditLog,
    } = createStoreIntegrationsServiceMocks();
    const disconnectedAt = new Date("2026-07-03T17:00:00.000Z");
    findFirstConnectedStore.mockResolvedValue({
      id: "store_1",
      businessId: "business_1",
      connectionStatus: StoreConnectionStatus.Connected,
      disconnectedAt: null,
      lastSynchronisedAt: null,
      platform: StorePlatform.WooCommerce,
    });
    removeAutomaticSync.mockResolvedValue({
      jobId: "woocommerce:auto:full-sync:store_1",
      platform: StorePlatform.WooCommerce,
      removedAt: disconnectedAt,
      status: "REMOVED",
      storeId: "store_1",
    });
    updateConnectedStore.mockResolvedValue({
      id: "store_1",
      businessId: "business_1",
      connectionStatus: StoreConnectionStatus.Disconnected,
      disconnectedAt,
      lastSynchronisedAt: new Date("2026-07-03T16:00:00.000Z"),
      platform: StorePlatform.WooCommerce,
      accessTokenHash: "should-not-leak",
      refreshTokenHash: "should-not-leak",
      accessTokenMetadata: { encryptedCredential: "should-not-leak" },
      refreshTokenMetadata: { encryptedCredential: "should-not-leak" },
    });

    await expect(
      service.disconnectStore("user_1", { storeId: "store_1" }),
    ).resolves.toEqual({
      disconnectedAt,
      platform: StorePlatform.WooCommerce,
      status: StoreConnectionStatus.Disconnected,
      storeId: "store_1",
    });
    expect(removeAutomaticSync).toHaveBeenCalledWith({
      id: "store_1",
      businessId: "business_1",
      connectionStatus: StoreConnectionStatus.Connected,
      disconnectedAt: null,
      lastSynchronisedAt: null,
      platform: StorePlatform.WooCommerce,
    });
    expect(updateConnectedStore).toHaveBeenCalledWith({
      where: { id: "store_1" },
      data: {
        connectionStatus: StoreConnectionStatus.Disconnected,
        disconnectedAt: expect.any(Date),
      },
      select: expect.objectContaining({
        disconnectedAt: true,
        id: true,
        platform: true,
      }),
    });
    expect(getProvider).not.toHaveBeenCalled();
    expect(disconnect).not.toHaveBeenCalled();
    expect(deleteCommerceOrders).not.toHaveBeenCalled();
    expect(deleteCommerceProducts).not.toHaveBeenCalled();
    expect(deleteCommerceCustomers).not.toHaveBeenCalled();
    expect(deleteCommerceInventorySnapshots).not.toHaveBeenCalled();
    expect(deleteCommerceCategories).not.toHaveBeenCalled();
    expect(deleteCommerceRefunds).not.toHaveBeenCalled();
    expect(recordAuditLog).toHaveBeenCalledWith({
      action: AuditAction.StoreDisconnected,
      affectedModule: AuditLogModule.StoreIntegrations,
      affectedPlatform: StorePlatform.WooCommerce,
      affectedStoreId: "store_1",
      businessId: "business_1",
      metadata: {
        connectionStatus: StoreConnectionStatus.Disconnected,
        disconnectedAt,
      },
      result: AuditLogResult.Success,
      userId: "user_1",
    });
  });

  it("does not expose credential material in disconnect responses", async () => {
    const { service, findFirstConnectedStore, updateConnectedStore, removeAutomaticSync } =
      createStoreIntegrationsServiceMocks();
    findFirstConnectedStore.mockResolvedValue({
      id: "store_1",
      businessId: "business_1",
      connectionStatus: StoreConnectionStatus.Connected,
      disconnectedAt: null,
      lastSynchronisedAt: null,
      platform: StorePlatform.WooCommerce,
    });
    removeAutomaticSync.mockResolvedValue({
      jobId: "woocommerce:auto:full-sync:store_1",
      platform: StorePlatform.WooCommerce,
      removedAt: new Date("2026-07-03T17:00:00.000Z"),
      status: "REMOVED",
      storeId: "store_1",
    });
    updateConnectedStore.mockResolvedValue({
      id: "store_1",
      businessId: "business_1",
      connectionStatus: StoreConnectionStatus.Disconnected,
      disconnectedAt: new Date("2026-07-03T17:00:00.000Z"),
      lastSynchronisedAt: null,
      platform: StorePlatform.WooCommerce,
      accessTokenHash: "should-not-leak",
      refreshTokenHash: "should-not-leak",
      encryptedCredential: "should-not-leak",
    });

    const response = await service.disconnectStore("user_1", { storeId: "store_1" });

    expect(JSON.stringify(response)).not.toContain("should-not-leak");
    expect(JSON.stringify(response)).not.toContain("accessTokenHash");
    expect(JSON.stringify(response)).not.toContain("refreshTokenHash");
    expect(JSON.stringify(response)).not.toContain("encryptedCredential");
  });

  it("keeps Amazon and TikTok disconnect as explicit future work", async () => {
    const { service, findFirstConnectedStore, updateConnectedStore, removeAutomaticSync, getProvider } =
      createStoreIntegrationsServiceMocks();
    findFirstConnectedStore.mockResolvedValue({
      id: "store_1",
      businessId: "business_1",
      connectionStatus: StoreConnectionStatus.Connected,
      disconnectedAt: null,
      lastSynchronisedAt: null,
      platform: StorePlatform.TikTokShop,
    });

    await expect(service.disconnectStore("user_1", { storeId: "store_1" })).rejects.toThrow(
      NotImplementedException,
    );
    expect(removeAutomaticSync).not.toHaveBeenCalled();
    expect(updateConnectedStore).not.toHaveBeenCalled();
    expect(getProvider).not.toHaveBeenCalled();
  });

  it.each([StoreConnectionStatus.Disconnected, StoreConnectionStatus.Error])(
    "rejects disconnect for %s WooCommerce stores",
    async (connectionStatus) => {
      const { service, findFirstConnectedStore, updateConnectedStore, removeAutomaticSync } =
        createStoreIntegrationsServiceMocks();
      findFirstConnectedStore.mockResolvedValue({
        id: "store_1",
        businessId: "business_1",
        connectionStatus,
        disconnectedAt: null,
        lastSynchronisedAt: null,
        platform: StorePlatform.WooCommerce,
      });

      await expect(service.disconnectStore("user_1", { storeId: "store_1" })).rejects.toThrow(
        ConflictException,
      );
      expect(removeAutomaticSync).not.toHaveBeenCalled();
      expect(updateConnectedStore).not.toHaveBeenCalled();
    },
  );

  it("allows the authenticated owner to enqueue a manual WooCommerce sync job", async () => {
    const { service, findFirstConnectedStore, getProvider, enqueueWooCommerceSyncJob, recordAuditLog } =
      createStoreIntegrationsServiceMocks();
    const queuedAt = new Date("2026-07-03T14:00:00.000Z");
    findFirstConnectedStore.mockResolvedValue({
      id: "store_1",
      businessId: "business_1",
      connectionStatus: StoreConnectionStatus.Connected,
      lastSynchronisedAt: null,
      platform: StorePlatform.WooCommerce,
    });
    enqueueWooCommerceSyncJob.mockResolvedValue({
      jobId: "job_1",
      platform: StorePlatform.WooCommerce,
      queuedAt,
      status: "QUEUED",
      storeId: "store_1",
    });

    await expect(
      service.requestManualSync("user_1", { storeId: "store_1" }),
    ).resolves.toEqual({
      jobId: "job_1",
      platform: StorePlatform.WooCommerce,
      queuedAt,
      status: "QUEUED",
      storeId: "store_1",
    });
    expect(enqueueWooCommerceSyncJob).toHaveBeenCalledWith(
      WooCommerceSyncJobName.ManualFullSync,
      expect.objectContaining({
        platform: StorePlatform.WooCommerce,
        requestedByUserId: "user_1",
        resource: "all",
        storeId: "store_1",
      }),
    );
    expect(enqueueWooCommerceSyncJob.mock.calls[0]?.[1].queuedAt).toEqual(expect.any(String));
    expect(getProvider).not.toHaveBeenCalled();
    expect(recordAuditLog).toHaveBeenCalledWith({
      action: AuditAction.ManualSyncJobQueued,
      affectedModule: AuditLogModule.StoreIntegrations,
      affectedPlatform: StorePlatform.WooCommerce,
      affectedStoreId: "store_1",
      businessId: "business_1",
      metadata: {
        jobId: "job_1",
        queuedAt,
        resource: "all",
      },
      result: AuditLogResult.Success,
      userId: "user_1",
    });
  });

  it("rejects manual sync for non-WooCommerce stores", async () => {
    const { service, findFirstConnectedStore, enqueueWooCommerceSyncJob } =
      createStoreIntegrationsServiceMocks();
    findFirstConnectedStore.mockResolvedValue({
      id: "store_1",
      businessId: "business_1",
      connectionStatus: StoreConnectionStatus.Connected,
      lastSynchronisedAt: null,
      platform: StorePlatform.TikTokShop,
    });

    await expect(service.requestManualSync("user_1", { storeId: "store_1" })).rejects.toThrow(
      BadRequestException,
    );
    expect(enqueueWooCommerceSyncJob).not.toHaveBeenCalled();
  });

  it.each([StoreConnectionStatus.Disconnected, StoreConnectionStatus.Error])(
    "rejects manual sync for %s stores",
    async (connectionStatus) => {
      const { service, findFirstConnectedStore, enqueueWooCommerceSyncJob } =
        createStoreIntegrationsServiceMocks();
      findFirstConnectedStore.mockResolvedValue({
        id: "store_1",
        businessId: "business_1",
        connectionStatus,
        lastSynchronisedAt: null,
        platform: StorePlatform.WooCommerce,
      });

      await expect(service.requestManualSync("user_1", { storeId: "store_1" })).rejects.toThrow(
        ConflictException,
      );
      expect(enqueueWooCommerceSyncJob).not.toHaveBeenCalled();
    },
  );

  it("returns a safe manual sync job response without credential material", async () => {
    const { service, findFirstConnectedStore, enqueueWooCommerceSyncJob } =
      createStoreIntegrationsServiceMocks();
    const queuedAt = new Date("2026-07-03T14:00:00.000Z");
    findFirstConnectedStore.mockResolvedValue({
      id: "store_1",
      businessId: "business_1",
      connectionStatus: StoreConnectionStatus.Connected,
      lastSynchronisedAt: null,
      platform: StorePlatform.WooCommerce,
    });
    enqueueWooCommerceSyncJob.mockResolvedValue({
      jobId: "job_1",
      platform: StorePlatform.WooCommerce,
      queuedAt,
      status: "QUEUED",
      storeId: "store_1",
      accessTokenHash: "should-not-leak",
      encryptedCredential: "should-not-leak",
      raw: { id: 1 },
    });

    const response = await service.requestManualSync("user_1", { storeId: "store_1" });

    expect(JSON.stringify(response)).not.toContain("should-not-leak");
    expect(JSON.stringify(response)).not.toContain("encryptedCredential");
    expect(JSON.stringify(response)).not.toContain("accessTokenHash");
    expect(JSON.stringify(response)).not.toContain('"raw"');
    expect(response).toMatchObject({
      jobId: "job_1",
      platform: StorePlatform.WooCommerce,
      queuedAt,
      status: "QUEUED",
      storeId: "store_1",
    });
  });

  it("queries connected stores by authenticated owner when manually syncing", async () => {
    const { service, findFirstConnectedStore, enqueueWooCommerceSyncJob } =
      createStoreIntegrationsServiceMocks();
    findFirstConnectedStore.mockResolvedValue({
      id: "store_1",
      businessId: "business_1",
      connectionStatus: StoreConnectionStatus.Connected,
      lastSynchronisedAt: null,
      platform: StorePlatform.WooCommerce,
    });
    enqueueWooCommerceSyncJob.mockResolvedValue({
      jobId: "job_1",
      platform: StorePlatform.WooCommerce,
      queuedAt: new Date("2026-07-03T14:00:00.000Z"),
      status: "QUEUED",
      storeId: "store_1",
    });

    await service.requestManualSync("user_1", { storeId: "store_1" });

    expect(findFirstConnectedStore).toHaveBeenCalledWith({
      where: { id: "store_1", business: { ownerId: "user_1" } },
      select: expect.objectContaining({
        businessId: true,
        connectionStatus: true,
        id: true,
        platform: true,
      }),
    });
  });

  it("rejects disconnect and sync for stores outside the authenticated user's business", async () => {
    const { service, findFirstConnectedStore, getProvider, enqueueWooCommerceSyncJob } =
      createStoreIntegrationsServiceMocks();
    findFirstConnectedStore.mockResolvedValue(null);

    await expect(service.disconnectStore("user_1", { storeId: "missing_store" })).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.requestManualSync("user_1", { storeId: "missing_store" })).rejects.toThrow(
      NotFoundException,
    );
    expect(getProvider).not.toHaveBeenCalled();
    expect(enqueueWooCommerceSyncJob).not.toHaveBeenCalled();
  });

  it("returns a safe failed sync job status for an owned store", async () => {
    const { service, findFirstConnectedStore, getJobStatus } = createStoreIntegrationsServiceMocks();
    const queuedAt = new Date("2026-07-03T14:00:00.000Z");
    const finishedAt = new Date("2026-07-03T14:01:00.000Z");
    getJobStatus.mockResolvedValue({
      failedReason: "WooCommerce timeout",
      finishedAt,
      jobId: "job_1",
      platform: StorePlatform.WooCommerce,
      queuedAt,
      status: "FAILED",
      storeId: "store_1",
      accessTokenHash: "should-not-leak",
      encryptedCredential: "should-not-leak",
    });
    findFirstConnectedStore.mockResolvedValue({
      id: "store_1",
      businessId: "business_1",
      connectionStatus: StoreConnectionStatus.Connected,
      lastSynchronisedAt: null,
      platform: StorePlatform.WooCommerce,
    });

    const response = await service.getManualSyncJobStatus("user_1", "job_1");

    expect(response).toEqual({
      failedReason: "WooCommerce timeout",
      finishedAt,
      jobId: "job_1",
      platform: StorePlatform.WooCommerce,
      queuedAt,
      status: "FAILED",
      storeId: "store_1",
    });
    expect(JSON.stringify(response)).not.toContain("should-not-leak");
    expect(findFirstConnectedStore).toHaveBeenCalledWith({
      where: { id: "store_1", business: { ownerId: "user_1" } },
      select: expect.objectContaining({ id: true }),
    });
  });

  it("rejects sync job status lookup for jobs outside the authenticated user's business", async () => {
    const { service, findFirstConnectedStore, getJobStatus } = createStoreIntegrationsServiceMocks();
    getJobStatus.mockResolvedValue({
      jobId: "job_1",
      platform: StorePlatform.WooCommerce,
      queuedAt: new Date("2026-07-03T14:00:00.000Z"),
      status: "QUEUED",
      storeId: "store_2",
    });
    findFirstConnectedStore.mockResolvedValue(null);

    await expect(service.getManualSyncJobStatus("user_1", "job_1")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("returns not found when a sync job cannot be found", async () => {
    const { service, findFirstConnectedStore, getJobStatus } = createStoreIntegrationsServiceMocks();
    getJobStatus.mockResolvedValue(null);

    await expect(service.getManualSyncJobStatus("user_1", "missing_job")).rejects.toThrow(
      NotFoundException,
    );
    expect(findFirstConnectedStore).not.toHaveBeenCalled();
  });

  it("allows the authenticated owner to view safe WooCommerce sync status", async () => {
    const {
      service,
      findFirstConnectedStore,
      findManySyncCursors,
      getWooCommerceStoreJobStatuses,
    } = createStoreIntegrationsServiceMocks();
    const lastSynchronisedAt = new Date("2026-07-03T14:00:00.000Z");
    const lastSuccessfulSyncedAt = new Date("2026-07-03T13:55:00.000Z");
    const lastAttemptedSyncedAt = new Date("2026-07-03T13:56:00.000Z");
    const queuedAt = new Date("2026-07-03T14:05:00.000Z");
    findFirstConnectedStore.mockResolvedValue({
      id: "store_1",
      businessId: "business_1",
      connectionStatus: StoreConnectionStatus.Connected,
      disconnectedAt: null,
      lastSynchronisedAt,
      platform: StorePlatform.WooCommerce,
    });
    findManySyncCursors.mockResolvedValue([
      {
        errorMetadata: null,
        lastAttemptedSyncedAt,
        lastSuccessfulSyncedAt,
        resource: CommerceSyncCursorResource.Orders,
        status: CommerceSyncCursorStatus.Success,
      },
      {
        errorMetadata: {
          encryptedCredential: "should-not-leak",
          errorName: "Error",
          message: "WooCommerce sync failed.",
          rawMarketplacePayload: { id: 1 },
        },
        lastAttemptedSyncedAt,
        lastSuccessfulSyncedAt: null,
        resource: CommerceSyncCursorResource.Products,
        status: CommerceSyncCursorStatus.Error,
      },
    ]);
    getWooCommerceStoreJobStatuses.mockResolvedValue([
      {
        failedReason: "WooCommerce timeout",
        jobId: "job_1",
        platform: StorePlatform.WooCommerce,
        queuedAt,
        status: "ACTIVE",
        storeId: "store_1",
        accessTokenHash: "should-not-leak",
      },
    ]);

    const response = await service.getStoreSyncStatus("user_1", "store_1");

    expect(findFirstConnectedStore).toHaveBeenCalledWith({
      where: { id: "store_1", business: { ownerId: "user_1" } },
      select: expect.objectContaining({ id: true, businessId: true, platform: true }),
    });
    expect(findManySyncCursors).toHaveBeenCalledWith({
      where: { connectedStoreId: "store_1" },
      orderBy: { resource: "asc" },
      select: expect.objectContaining({ errorMetadata: true }),
    });
    expect(getWooCommerceStoreJobStatuses).toHaveBeenCalledWith("store_1");
    expect(response).toMatchObject({
      connectionStatus: StoreConnectionStatus.Connected,
      jobs: [
        {
          failedReason: "WooCommerce timeout",
          jobId: "job_1",
          platform: StorePlatform.WooCommerce,
          queuedAt,
          status: "ACTIVE",
          storeId: "store_1",
        },
      ],
      lastSynchronisedAt,
      platform: StorePlatform.WooCommerce,
      storeId: "store_1",
    });
    expect(response.cursors).toHaveLength(6);
    expect(response.cursors).toEqual(
      expect.arrayContaining([
        {
          errorSummary: null,
          lastAttemptedSyncedAt,
          lastSuccessfulSyncedAt,
          resource: CommerceSyncCursorResource.Orders,
          status: CommerceSyncCursorStatus.Success,
        },
        {
          errorSummary: {
            errorName: "Error",
            message: "WooCommerce sync failed.",
          },
          lastAttemptedSyncedAt,
          lastSuccessfulSyncedAt: null,
          resource: CommerceSyncCursorResource.Products,
          status: CommerceSyncCursorStatus.Error,
        },
        expect.objectContaining({
          errorSummary: null,
          resource: CommerceSyncCursorResource.Customers,
          status: "NOT_STARTED",
        }),
      ]),
    );
    expect(JSON.stringify(response)).not.toContain("should-not-leak");
    expect(JSON.stringify(response)).not.toContain("encryptedCredential");
    expect(JSON.stringify(response)).not.toContain("accessTokenHash");
    expect(JSON.stringify(response)).not.toContain("rawMarketplacePayload");
  });

  it("rejects sync status for stores outside the authenticated user's business", async () => {
    const { service, findFirstConnectedStore, findManySyncCursors, getWooCommerceStoreJobStatuses } =
      createStoreIntegrationsServiceMocks();
    findFirstConnectedStore.mockResolvedValue(null);

    await expect(service.getStoreSyncStatus("user_1", "missing_store")).rejects.toThrow(
      NotFoundException,
    );
    expect(findManySyncCursors).not.toHaveBeenCalled();
    expect(getWooCommerceStoreJobStatuses).not.toHaveBeenCalled();
  });

  it("keeps Amazon and TikTok sync status as explicit future work", async () => {
    const { service, findFirstConnectedStore, findManySyncCursors, getWooCommerceStoreJobStatuses } =
      createStoreIntegrationsServiceMocks();
    findFirstConnectedStore.mockResolvedValue({
      id: "store_1",
      businessId: "business_1",
      connectionStatus: StoreConnectionStatus.Connected,
      disconnectedAt: null,
      lastSynchronisedAt: null,
      platform: StorePlatform.AmazonSeller,
    });

    await expect(service.getStoreSyncStatus("user_1", "store_1")).rejects.toThrow(
      BadRequestException,
    );
    expect(findManySyncCursors).not.toHaveBeenCalled();
    expect(getWooCommerceStoreJobStatuses).not.toHaveBeenCalled();
  });

  it("schedules automatic sync for stores owned by the authenticated user", async () => {
    const { service, findFirstConnectedStore, scheduleAutomaticSync, recordAuditLog } =
      createStoreIntegrationsServiceMocks();
    const scheduledAt = new Date("2026-07-03T15:00:00.000Z");
    const store = {
      id: "store_1",
      businessId: "business_1",
      connectionStatus: StoreConnectionStatus.Connected,
      lastSynchronisedAt: null,
      platform: StorePlatform.WooCommerce,
    };
    findFirstConnectedStore.mockResolvedValue(store);
    scheduleAutomaticSync.mockResolvedValue({
      everyMs: 3_600_000,
      jobId: "woocommerce:auto:full-sync:store_1",
      platform: StorePlatform.WooCommerce,
      scheduledAt,
      status: "SCHEDULED",
      storeId: "store_1",
    });

    await expect(service.scheduleAutomaticSync("user_1", { storeId: "store_1" })).resolves.toEqual({
      everyMs: 3_600_000,
      jobId: "woocommerce:auto:full-sync:store_1",
      platform: StorePlatform.WooCommerce,
      scheduledAt,
      status: "SCHEDULED",
      storeId: "store_1",
    });
    expect(scheduleAutomaticSync).toHaveBeenCalledWith(store, "user_1");
    expect(recordAuditLog).toHaveBeenCalledWith({
      action: AuditAction.ScheduledSyncCreated,
      affectedModule: AuditLogModule.StoreIntegrations,
      affectedPlatform: StorePlatform.WooCommerce,
      affectedStoreId: "store_1",
      businessId: "business_1",
      metadata: {
        everyMs: 3_600_000,
        jobId: "woocommerce:auto:full-sync:store_1",
        scheduledAt,
      },
      result: AuditLogResult.Success,
      userId: "user_1",
    });
  });

  it("removes automatic sync schedules for stores owned by the authenticated user", async () => {
    const { service, findFirstConnectedStore, removeAutomaticSync, recordAuditLog } =
      createStoreIntegrationsServiceMocks();
    const removedAt = new Date("2026-07-03T15:00:00.000Z");
    const store = {
      id: "store_1",
      businessId: "business_1",
      connectionStatus: StoreConnectionStatus.Disconnected,
      lastSynchronisedAt: null,
      platform: StorePlatform.WooCommerce,
    };
    findFirstConnectedStore.mockResolvedValue(store);
    removeAutomaticSync.mockResolvedValue({
      jobId: "woocommerce:auto:full-sync:store_1",
      platform: StorePlatform.WooCommerce,
      removedAt,
      status: "REMOVED",
      storeId: "store_1",
    });

    await expect(
      service.removeAutomaticSyncSchedule("user_1", { storeId: "store_1" }),
    ).resolves.toEqual({
      jobId: "woocommerce:auto:full-sync:store_1",
      platform: StorePlatform.WooCommerce,
      removedAt,
      status: "REMOVED",
      storeId: "store_1",
    });
    expect(removeAutomaticSync).toHaveBeenCalledWith(store);
    expect(recordAuditLog).toHaveBeenCalledWith({
      action: AuditAction.ScheduledSyncRemoved,
      affectedModule: AuditLogModule.StoreIntegrations,
      affectedPlatform: StorePlatform.WooCommerce,
      affectedStoreId: "store_1",
      businessId: "business_1",
      metadata: {
        jobId: "woocommerce:auto:full-sync:store_1",
        removedAt,
        status: "REMOVED",
      },
      result: AuditLogResult.Success,
      userId: "user_1",
    });
  });
});
