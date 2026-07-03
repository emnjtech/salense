import { UnauthorizedException } from "@nestjs/common";
import { StoreIntegrationsController } from "../store-integrations.controller.js";
import type { StoreIntegrationsService } from "../store-integrations.service.js";
import type { ConnectedStoreResponse } from "../types/connected-store-response.type.js";
import { StoreConnectionStatus } from "../types/store-connection-status.enum.js";
import { StorePlatform } from "../types/store-platform.enum.js";
import { WooCommerceApiVersion } from "@salense/integrations";

describe("StoreIntegrationsController", () => {
  const storeIntegrationsService = {
    listSupportedPlatforms: jest.fn(),
    listConnectedStores: jest.fn(),
    prepareStoreConnection: jest.fn(),
    disconnectStore: jest.fn(),
    requestManualSync: jest.fn(),
  } as unknown as StoreIntegrationsService;
  const controller = new StoreIntegrationsController(storeIntegrationsService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("delegates supported platform listing", () => {
    const response = [
      {
        platform: StorePlatform.WooCommerce,
        label: "WooCommerce",
        requiresStoreUrl: true,
        requiresRegion: false,
      },
    ];
    jest.mocked(storeIntegrationsService.listSupportedPlatforms).mockReturnValueOnce(
      response as ReturnType<StoreIntegrationsService["listSupportedPlatforms"]>,
    );

    expect(controller.listSupportedPlatforms()).toBe(response);
  });

  it("delegates connected store listing for authenticated users", async () => {
    const response: readonly ConnectedStoreResponse[] = [];
    jest.mocked(storeIntegrationsService.listConnectedStores).mockResolvedValueOnce(response);

    await expect(
      controller.listConnectedStores({
        headers: {},
        user: { sub: "user_1", email: "owner@example.com", emailVerified: true },
      }),
    ).resolves.toBe(response);
    expect(storeIntegrationsService.listConnectedStores).toHaveBeenCalledWith("user_1");
  });

  it("delegates connection preparation for authenticated users", async () => {
    const response = {
      id: "store_1",
      businessId: "business_1",
      platform: StorePlatform.WooCommerce,
      storeName: "Main Store",
      storeUrl: "https://shop.example.com",
      region: null,
      connectionStatus: StoreConnectionStatus.PendingValidation,
      lastSynchronisedAt: null,
      createdAt: new Date("2026-07-03T11:00:00.000Z"),
      updatedAt: new Date("2026-07-03T11:00:01.000Z"),
    } as const;
    jest.mocked(storeIntegrationsService.prepareStoreConnection).mockResolvedValueOnce(response);

    await expect(
      controller.prepareStoreConnection(
        {
          headers: {},
          user: { sub: "user_1", email: "owner@example.com", emailVerified: true },
        },
        {
          platform: StorePlatform.WooCommerce,
          storeName: "Main Store",
          storeUrl: "https://shop.example.com",
          wooCommerceCredentials: {
            consumerKey: "ck_live_placeholder",
            consumerSecret: "cs_live_placeholder",
            apiVersion: WooCommerceApiVersion.WcV3,
          },
        },
      ),
    ).resolves.toBe(response);
    expect(storeIntegrationsService.prepareStoreConnection).toHaveBeenCalledWith("user_1", {
      platform: StorePlatform.WooCommerce,
      storeName: "Main Store",
      storeUrl: "https://shop.example.com",
      wooCommerceCredentials: {
        consumerKey: "ck_live_placeholder",
        consumerSecret: "cs_live_placeholder",
        apiVersion: WooCommerceApiVersion.WcV3,
      },
    });
  });

  it("delegates disconnect and sync actions for authenticated users", async () => {
    const syncedAt = new Date("2026-07-03T14:00:00.000Z");
    jest.mocked(storeIntegrationsService.disconnectStore).mockRejectedValueOnce(
      new Error("disconnect placeholder"),
    );
    jest.mocked(storeIntegrationsService.requestManualSync).mockResolvedValueOnce({
      errors: [],
      lastSynchronisedAt: syncedAt,
      platform: StorePlatform.WooCommerce,
      resourcesSynced: [],
      status: "SUCCESS",
      storeId: "store_1",
    });

    await expect(
      controller.disconnectStore(
        {
          headers: {},
          user: { sub: "user_1", email: "owner@example.com", emailVerified: true },
        },
        { storeId: "store_1" },
      ),
    ).rejects.toThrow("disconnect placeholder");
    await expect(
      controller.requestManualSync(
        {
          headers: {},
          user: { sub: "user_1", email: "owner@example.com", emailVerified: true },
        },
        { storeId: "store_1" },
      ),
    ).resolves.toEqual({
      errors: [],
      lastSynchronisedAt: syncedAt,
      platform: StorePlatform.WooCommerce,
      resourcesSynced: [],
      status: "SUCCESS",
      storeId: "store_1",
    });
  });

  it("rejects protected actions when authenticated context is missing", async () => {
    expect(() => controller.listConnectedStores({ headers: {} })).toThrow(UnauthorizedException);
    expect(() =>
      controller.prepareStoreConnection(
        { headers: {} },
        { platform: StorePlatform.WooCommerce, storeName: "Main Store" },
      ),
    ).toThrow(UnauthorizedException);
    expect(() => controller.requestManualSync({ headers: {} }, { storeId: "store_1" })).toThrow(
      UnauthorizedException,
    );
  });
});
