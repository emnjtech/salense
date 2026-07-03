import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  NotImplementedException,
  UnauthorizedException,
} from "@nestjs/common";
import type { PrismaService } from "../../database/prisma.service.js";
import { StoreIntegrationsService } from "../store-integrations.service.js";
import { StoreConnectionStatus } from "../types/store-connection-status.enum.js";
import { StorePlatform } from "../types/store-platform.enum.js";

function createStoreIntegrationsServiceMocks(): {
  readonly service: StoreIntegrationsService;
  readonly findBusiness: jest.Mock;
  readonly findManyConnectedStores: jest.Mock;
  readonly findFirstConnectedStore: jest.Mock;
} {
  const findBusiness = jest.fn();
  const findManyConnectedStores = jest.fn();
  const findFirstConnectedStore = jest.fn();
  const prismaService = {
    client: {
      business: { findUnique: findBusiness },
      connectedStore: {
        findMany: findManyConnectedStores,
        findFirst: findFirstConnectedStore,
      },
    },
  } as unknown as PrismaService;

  return {
    service: new StoreIntegrationsService(prismaService),
    findBusiness,
    findManyConnectedStores,
    findFirstConnectedStore,
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
    const { service, findBusiness } = createStoreIntegrationsServiceMocks();

    await expect(
      service.prepareStoreConnection("user_1", {
        platform: "SHOPIFY" as StorePlatform,
        storeName: "Unsupported Store",
      }),
    ).rejects.toThrow(BadRequestException);
    expect(findBusiness).not.toHaveBeenCalled();
  });

  it("requires a company profile before preparing a store connection", async () => {
    const { service, findBusiness, findFirstConnectedStore } = createStoreIntegrationsServiceMocks();
    findBusiness.mockResolvedValue(null);

    await expect(
      service.prepareStoreConnection("user_1", {
        platform: StorePlatform.WooCommerce,
        storeName: "Main Store",
        storeUrl: "https://shop.example.com",
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(findFirstConnectedStore).not.toHaveBeenCalled();
  });

  it("enforces the duplicate store connection rule before placeholder auth", async () => {
    const { service, findBusiness, findFirstConnectedStore } = createStoreIntegrationsServiceMocks();
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
  });

  it("uses an explicit placeholder for real platform connection preparation", async () => {
    const { service, findBusiness, findFirstConnectedStore } = createStoreIntegrationsServiceMocks();
    findBusiness.mockResolvedValue({ id: "business_1" });
    findFirstConnectedStore.mockResolvedValue(null);

    await expect(
      service.prepareStoreConnection("user_1", {
        platform: StorePlatform.AmazonSeller,
        storeName: "Amazon UK",
        region: "gb",
      }),
    ).rejects.toThrow(NotImplementedException);
  });

  it("uses an explicit placeholder for platform disconnect", async () => {
    const { service, findFirstConnectedStore } = createStoreIntegrationsServiceMocks();
    findFirstConnectedStore.mockResolvedValue({ id: "store_1" });

    await expect(
      service.disconnectStore("user_1", { storeId: "store_1" }),
    ).rejects.toThrow(NotImplementedException);
  });

  it("uses an explicit placeholder for manual synchronisation", async () => {
    const { service, findFirstConnectedStore } = createStoreIntegrationsServiceMocks();
    findFirstConnectedStore.mockResolvedValue({ id: "store_1" });

    await expect(
      service.requestManualSync("user_1", { storeId: "store_1" }),
    ).rejects.toThrow(NotImplementedException);
  });

  it("rejects disconnect and sync for stores outside the authenticated user's business", async () => {
    const { service, findFirstConnectedStore } = createStoreIntegrationsServiceMocks();
    findFirstConnectedStore.mockResolvedValue(null);

    await expect(service.disconnectStore("user_1", { storeId: "missing_store" })).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.requestManualSync("user_1", { storeId: "missing_store" })).rejects.toThrow(
      NotFoundException,
    );
  });
});
