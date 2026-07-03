import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  NotImplementedException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  IntegrationNotImplementedError,
  IntegrationPlatform,
  WooCommerceApiVersion,
  type IntegrationFactory,
} from "@salense/integrations";
import type { PrismaService } from "../../database/prisma.service.js";
import type { AesCredentialEncryptionService } from "../security/credential-encryption.service.js";
import { StoreIntegrationsService } from "../store-integrations.service.js";
import { StoreConnectionStatus } from "../types/store-connection-status.enum.js";
import { StorePlatform } from "../types/store-platform.enum.js";

function createStoreIntegrationsServiceMocks(): {
  readonly service: StoreIntegrationsService;
  readonly findBusiness: jest.Mock;
  readonly findManyConnectedStores: jest.Mock;
  readonly findFirstConnectedStore: jest.Mock;
  readonly getProvider: jest.Mock;
  readonly connect: jest.Mock;
  readonly disconnect: jest.Mock;
  readonly synchroniseOrders: jest.Mock;
  readonly encrypt: jest.Mock;
} {
  const findBusiness = jest.fn();
  const findManyConnectedStores = jest.fn();
  const findFirstConnectedStore = jest.fn();
  const connect = jest.fn();
  const disconnect = jest.fn();
  const synchroniseOrders = jest.fn();
  const getProvider = jest.fn().mockReturnValue({ connect, disconnect, synchroniseOrders });
  const encrypt = jest.fn((plaintext: string) => ({
    algorithm: "aes-256-gcm" as const,
    authTag: `auth-tag-${plaintext}`,
    ciphertext: `encrypted-${plaintext}`,
    iv: `iv-${plaintext}`,
    keyId: "test-key",
  }));
  const prismaService = {
    client: {
      business: { findUnique: findBusiness },
      connectedStore: {
        findMany: findManyConnectedStores,
        findFirst: findFirstConnectedStore,
      },
    },
  } as unknown as PrismaService;
  const integrationFactory = { getProvider } as unknown as IntegrationFactory;
  const credentialEncryption = { encrypt } as unknown as AesCredentialEncryptionService;

  return {
    service: new StoreIntegrationsService(prismaService, integrationFactory, credentialEncryption),
    findBusiness,
    findManyConnectedStores,
    findFirstConnectedStore,
    getProvider,
    connect,
    disconnect,
    encrypt,
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

  it("prepares WooCommerce credential placeholders without faking connection success", async () => {
    const { service, findBusiness, findFirstConnectedStore, getProvider, connect, encrypt } =
      createStoreIntegrationsServiceMocks();
    findBusiness.mockResolvedValue({ id: "business_1" });
    findFirstConnectedStore.mockResolvedValue(null);
    connect.mockRejectedValue(
      new IntegrationNotImplementedError("WooCommerce connect is not implemented.", {
        platform: IntegrationPlatform.WooCommerce,
      }),
    );

    await expect(
      service.prepareStoreConnection("user_1", {
        platform: StorePlatform.WooCommerce,
        storeName: "Main Store",
        storeUrl: " https://shop.example.com ",
        wooCommerceCredentials: {
          consumerKey: "ck_live_placeholder",
          consumerSecret: "cs_live_placeholder",
          apiVersion: WooCommerceApiVersion.WcV3,
        },
      }),
    ).rejects.toThrow(NotImplementedException);

    expect(getProvider).toHaveBeenCalledWith(IntegrationPlatform.WooCommerce);
    expect(encrypt).toHaveBeenCalledWith("ck_live_placeholder");
    expect(encrypt).toHaveBeenCalledWith("cs_live_placeholder");
    expect(connect).toHaveBeenCalledWith(
      expect.objectContaining({
        accessTokenHash: expect.any(String),
        accessTokenMetadata: expect.objectContaining({
          credentialKind: "woocommerce_consumer_key",
          encryptedCredential: expect.objectContaining({ ciphertext: "encrypted-ck_live_placeholder" }),
        }),
        apiVersion: WooCommerceApiVersion.WcV3,
        businessId: "business_1",
        consumerKeyMetadata: { configured: true, keyId: "test-key" },
        consumerSecretMetadata: { configured: true, keyId: "test-key" },
        platform: IntegrationPlatform.WooCommerce,
        refreshTokenHash: expect.any(String),
        refreshTokenMetadata: expect.objectContaining({
          credentialKind: "woocommerce_consumer_secret",
          encryptedCredential: expect.objectContaining({ ciphertext: "encrypted-cs_live_placeholder" }),
        }),
        storeName: "Main Store",
        storeUrl: "https://shop.example.com",
      }),
    );
    expect(JSON.stringify(connect.mock.calls)).not.toContain("marketplacePassword");
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

  it("uses the shared integration framework for platform disconnect", async () => {
    const { service, findFirstConnectedStore, getProvider, disconnect } =
      createStoreIntegrationsServiceMocks();
    findFirstConnectedStore.mockResolvedValue({
      id: "store_1",
      businessId: "business_1",
      platform: StorePlatform.WooCommerce,
    });
    disconnect.mockRejectedValue(
      new IntegrationNotImplementedError("WooCommerce disconnect is not implemented.", {
        platform: IntegrationPlatform.WooCommerce,
      }),
    );

    await expect(
      service.disconnectStore("user_1", { storeId: "store_1" }),
    ).rejects.toThrow(NotImplementedException);
    expect(getProvider).toHaveBeenCalledWith(IntegrationPlatform.WooCommerce);
    expect(disconnect).toHaveBeenCalledWith({
      businessId: "business_1",
      platform: IntegrationPlatform.WooCommerce,
      storeId: "store_1",
    });
  });

  it("uses the shared integration framework for manual synchronisation", async () => {
    const { service, findFirstConnectedStore, getProvider, synchroniseOrders } =
      createStoreIntegrationsServiceMocks();
    findFirstConnectedStore.mockResolvedValue({
      id: "store_1",
      businessId: "business_1",
      platform: StorePlatform.TikTokShop,
    });
    synchroniseOrders.mockRejectedValue(
      new IntegrationNotImplementedError("TikTok Shop sync is not implemented.", {
        platform: IntegrationPlatform.TikTokShop,
      }),
    );

    await expect(
      service.requestManualSync("user_1", { storeId: "store_1" }),
    ).rejects.toThrow(NotImplementedException);
    expect(getProvider).toHaveBeenCalledWith(IntegrationPlatform.TikTokShop);
    expect(synchroniseOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: "business_1",
        platform: IntegrationPlatform.TikTokShop,
        storeId: "store_1",
      }),
    );
  });

  it("propagates non-placeholder integration errors", async () => {
    const { service, findBusiness, findFirstConnectedStore, connect } =
      createStoreIntegrationsServiceMocks();
    findBusiness.mockResolvedValue({ id: "business_1" });
    findFirstConnectedStore.mockResolvedValue(null);
    connect.mockRejectedValue(new InternalServerErrorException("Unexpected provider failure."));

    await expect(
      service.prepareStoreConnection("user_1", {
        platform: StorePlatform.WooCommerce,
        storeName: "Main Store",
        storeUrl: "https://shop.example.com",
        wooCommerceCredentials: {
          consumerKey: "ck_live_placeholder",
          consumerSecret: "cs_live_placeholder",
          apiVersion: WooCommerceApiVersion.WcV3,
        },
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it("rejects disconnect and sync for stores outside the authenticated user's business", async () => {
    const { service, findFirstConnectedStore, getProvider } = createStoreIntegrationsServiceMocks();
    findFirstConnectedStore.mockResolvedValue(null);

    await expect(service.disconnectStore("user_1", { storeId: "missing_store" })).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.requestManualSync("user_1", { storeId: "missing_store" })).rejects.toThrow(
      NotFoundException,
    );
    expect(getProvider).not.toHaveBeenCalled();
  });
});
