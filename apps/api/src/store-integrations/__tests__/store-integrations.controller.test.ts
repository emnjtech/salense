import { UnauthorizedException } from "@nestjs/common";
import type { StoreIntegrationOAuthService } from "../store-integration-oauth.service.js";
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
    getManualSyncJobStatus: jest.fn(),
    getStoreSyncStatus: jest.fn(),
    removeAutomaticSyncSchedule: jest.fn(),
    requestManualSync: jest.fn(),
    scheduleAutomaticSync: jest.fn(),
  } as unknown as StoreIntegrationsService;
  const storeIntegrationOAuthService = {
    handleAmazonSellerCallback: jest.fn(),
    handleShopifyCallback: jest.fn(),
    handleTikTokShopCallback: jest.fn(),
    startAmazonSellerOAuth: jest.fn(),
    startShopifyOAuth: jest.fn(),
    startTikTokShopOAuth: jest.fn(),
  } as unknown as StoreIntegrationOAuthService;
  const controller = new StoreIntegrationsController(
    storeIntegrationsService,
    storeIntegrationOAuthService,
  );

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

  it("delegates Shopify OAuth start for authenticated users", () => {
    const response = {
      authorizationUrl: "https://northstar.myshopify.com/admin/oauth/authorize",
      platform: StorePlatform.Shopify,
      stateExpiresAt: "2026-07-08T10:10:00.000Z",
    };
    jest.mocked(storeIntegrationOAuthService.startShopifyOAuth).mockReturnValueOnce(response);

    expect(
      controller.startShopifyOAuth(
        {
          headers: {},
          user: { sub: "user_1", email: "owner@example.com", emailVerified: true },
        },
        { shop: "northstar.myshopify.com", storeName: "Northstar Shopify" },
      ),
    ).toBe(response);
    expect(storeIntegrationOAuthService.startShopifyOAuth).toHaveBeenCalledWith("user_1", {
      shop: "northstar.myshopify.com",
      storeName: "Northstar Shopify",
    });
  });

  it("redirects after Shopify OAuth callback", async () => {
    const response = { redirect: jest.fn() };
    jest
      .mocked(storeIntegrationOAuthService.handleShopifyCallback)
      .mockResolvedValueOnce("https://app.salense.test/store-integrations?connected=shopify");

    await controller.handleShopifyOAuthCallback(
      { code: "auth-code", state: "state.signature" },
      response,
    );

    expect(response.redirect).toHaveBeenCalledWith(
      "https://app.salense.test/store-integrations?connected=shopify",
    );
  });

  it("delegates disconnect and sync actions for authenticated users", async () => {
    const queuedAt = new Date("2026-07-03T14:00:00.000Z");
    const disconnectedAt = new Date("2026-07-03T17:00:00.000Z");
    jest.mocked(storeIntegrationsService.disconnectStore).mockResolvedValueOnce({
      disconnectedAt,
      platform: StorePlatform.WooCommerce,
      status: StoreConnectionStatus.Disconnected,
      storeId: "store_1",
    });
    jest.mocked(storeIntegrationsService.requestManualSync).mockResolvedValueOnce({
      jobId: "job_1",
      platform: StorePlatform.WooCommerce,
      queuedAt,
      status: "QUEUED",
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
    ).resolves.toEqual({
      disconnectedAt,
      platform: StorePlatform.WooCommerce,
      status: StoreConnectionStatus.Disconnected,
      storeId: "store_1",
    });
    await expect(
      controller.requestManualSync(
        {
          headers: {},
          user: { sub: "user_1", email: "owner@example.com", emailVerified: true },
        },
        { storeId: "store_1" },
      ),
    ).resolves.toEqual({
      jobId: "job_1",
      platform: StorePlatform.WooCommerce,
      queuedAt,
      status: "QUEUED",
      storeId: "store_1",
    });
  });

  it("delegates sync job status lookup for authenticated users", async () => {
    const queuedAt = new Date("2026-07-03T14:00:00.000Z");
    const response = {
      failedReason: "WooCommerce timeout",
      jobId: "job_1",
      platform: StorePlatform.WooCommerce,
      queuedAt,
      status: "FAILED" as const,
      storeId: "store_1",
    };
    jest.mocked(storeIntegrationsService.getManualSyncJobStatus).mockResolvedValueOnce(response);

    await expect(
      controller.getManualSyncJobStatus(
        {
          headers: {},
          user: { sub: "user_1", email: "owner@example.com", emailVerified: true },
        },
        "job_1",
      ),
    ).resolves.toBe(response);
    expect(storeIntegrationsService.getManualSyncJobStatus).toHaveBeenCalledWith("user_1", "job_1");
  });

  it("delegates store sync status lookup for authenticated users", async () => {
    const lastSynchronisedAt = new Date("2026-07-03T14:00:00.000Z");
    const response = {
      connectionStatus: StoreConnectionStatus.Connected,
      cursors: [],
      jobs: [],
      lastSynchronisedAt,
      platform: StorePlatform.WooCommerce,
      storeId: "store_1",
    };
    jest.mocked(storeIntegrationsService.getStoreSyncStatus).mockResolvedValueOnce(response);

    await expect(
      controller.getStoreSyncStatus(
        {
          headers: {},
          user: { sub: "user_1", email: "owner@example.com", emailVerified: true },
        },
        "store_1",
      ),
    ).resolves.toBe(response);
    expect(storeIntegrationsService.getStoreSyncStatus).toHaveBeenCalledWith("user_1", "store_1");
  });

  it("delegates sync schedule actions for authenticated users", async () => {
    const scheduledAt = new Date("2026-07-03T15:00:00.000Z");
    const removedAt = new Date("2026-07-03T16:00:00.000Z");
    jest.mocked(storeIntegrationsService.scheduleAutomaticSync).mockResolvedValueOnce({
      everyMs: 3_600_000,
      jobId: "woocommerce:auto:full-sync:store_1",
      platform: StorePlatform.WooCommerce,
      scheduledAt,
      status: "SCHEDULED",
      storeId: "store_1",
    });
    jest.mocked(storeIntegrationsService.removeAutomaticSyncSchedule).mockResolvedValueOnce({
      jobId: "woocommerce:auto:full-sync:store_1",
      platform: StorePlatform.WooCommerce,
      removedAt,
      status: "REMOVED",
      storeId: "store_1",
    });

    const request = {
      headers: {},
      user: { sub: "user_1", email: "owner@example.com", emailVerified: true },
    } as const;

    await expect(controller.scheduleAutomaticSync(request, { storeId: "store_1" })).resolves.toEqual({
      everyMs: 3_600_000,
      jobId: "woocommerce:auto:full-sync:store_1",
      platform: StorePlatform.WooCommerce,
      scheduledAt,
      status: "SCHEDULED",
      storeId: "store_1",
    });
    await expect(
      controller.removeAutomaticSyncSchedule(request, { storeId: "store_1" }),
    ).resolves.toEqual({
      jobId: "woocommerce:auto:full-sync:store_1",
      platform: StorePlatform.WooCommerce,
      removedAt,
      status: "REMOVED",
      storeId: "store_1",
    });
    expect(storeIntegrationsService.scheduleAutomaticSync).toHaveBeenCalledWith("user_1", {
      storeId: "store_1",
    });
    expect(storeIntegrationsService.removeAutomaticSyncSchedule).toHaveBeenCalledWith("user_1", {
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
    expect(() => controller.disconnectStore({ headers: {} }, { storeId: "store_1" })).toThrow(
      UnauthorizedException,
    );
    expect(() => controller.requestManualSync({ headers: {} }, { storeId: "store_1" })).toThrow(
      UnauthorizedException,
    );
    expect(() => controller.getManualSyncJobStatus({ headers: {} }, "job_1")).toThrow(
      UnauthorizedException,
    );
    expect(() => controller.getStoreSyncStatus({ headers: {} }, "store_1")).toThrow(
      UnauthorizedException,
    );
    expect(() => controller.scheduleAutomaticSync({ headers: {} }, { storeId: "store_1" })).toThrow(
      UnauthorizedException,
    );
    expect(() =>
      controller.removeAutomaticSyncSchedule({ headers: {} }, { storeId: "store_1" }),
    ).toThrow(UnauthorizedException);
  });
});
