import { ConflictException } from "@nestjs/common";
import { StoreConnectionStatus } from "../../types/store-connection-status.enum.js";
import { StorePlatform } from "../../types/store-platform.enum.js";
import type { SyncQueuePort } from "../sync-queue.types.js";
import { WooCommerceSyncSchedulingService } from "../woocommerce-sync-scheduling.service.js";

function createSchedulingMocks(): {
  readonly service: WooCommerceSyncSchedulingService;
  readonly getRecurringWooCommerceSyncJob: jest.Mock;
  readonly removeRecurringWooCommerceSyncJob: jest.Mock;
  readonly scheduleRecurringWooCommerceSyncJob: jest.Mock;
} {
  const getRecurringWooCommerceSyncJob = jest.fn();
  const removeRecurringWooCommerceSyncJob = jest.fn();
  const scheduleRecurringWooCommerceSyncJob = jest.fn();
  const syncQueue = {
    getRecurringWooCommerceSyncJob,
    removeRecurringWooCommerceSyncJob,
    scheduleRecurringWooCommerceSyncJob,
  } as unknown as SyncQueuePort;

  return {
    service: new WooCommerceSyncSchedulingService(syncQueue),
    getRecurringWooCommerceSyncJob,
    removeRecurringWooCommerceSyncJob,
    scheduleRecurringWooCommerceSyncJob,
  };
}

describe("WooCommerceSyncSchedulingService", () => {
  const previousInterval = process.env.SYNC_SCHEDULE_INTERVAL_MS;

  afterEach(() => {
    jest.clearAllMocks();
    if (previousInterval === undefined) {
      delete process.env.SYNC_SCHEDULE_INTERVAL_MS;
    } else {
      process.env.SYNC_SCHEDULE_INTERVAL_MS = previousInterval;
    }
  });

  it("creates a recurring sync schedule for a connected WooCommerce store", async () => {
    const { service, getRecurringWooCommerceSyncJob, scheduleRecurringWooCommerceSyncJob } =
      createSchedulingMocks();
    const scheduledAt = new Date("2026-07-03T15:00:00.000Z");
    process.env.SYNC_SCHEDULE_INTERVAL_MS = "1800000";
    getRecurringWooCommerceSyncJob.mockResolvedValue(null);
    scheduleRecurringWooCommerceSyncJob.mockResolvedValue({
      everyMs: 1_800_000,
      jobId: "woocommerce:auto:full-sync:store_1",
      platform: StorePlatform.WooCommerce,
      scheduledAt,
      status: "SCHEDULED",
      storeId: "store_1",
      encryptedCredential: "should-not-leak",
    });

    const response = await service.scheduleAutomaticSync(
      {
        id: "store_1",
        connectionStatus: StoreConnectionStatus.Connected,
        platform: StorePlatform.WooCommerce,
      },
      "user_1",
    );

    expect(scheduleRecurringWooCommerceSyncJob).toHaveBeenCalledWith({
      data: expect.objectContaining({
        platform: StorePlatform.WooCommerce,
        requestedByUserId: "user_1",
        resource: "all",
        storeId: "store_1",
      }),
      everyMs: 1_800_000,
      jobId: "woocommerce:auto:full-sync:store_1",
      name: "woocommerce.manual.full-sync",
    });
    expect(response).toEqual({
      everyMs: 1_800_000,
      jobId: "woocommerce:auto:full-sync:store_1",
      platform: StorePlatform.WooCommerce,
      scheduledAt,
      status: "SCHEDULED",
      storeId: "store_1",
    });
    expect(JSON.stringify(response)).not.toContain("should-not-leak");
  });

  it.each([StoreConnectionStatus.Disconnected, StoreConnectionStatus.Error])(
    "rejects scheduling for %s stores",
    async (connectionStatus) => {
      const { service, scheduleRecurringWooCommerceSyncJob } = createSchedulingMocks();

      await expect(
        service.scheduleAutomaticSync(
          { id: "store_1", connectionStatus, platform: StorePlatform.WooCommerce },
          "user_1",
        ),
      ).rejects.toThrow(ConflictException);
      expect(scheduleRecurringWooCommerceSyncJob).not.toHaveBeenCalled();
    },
  );

  it("creates a recurring sync schedule for a connected Amazon Seller store", async () => {
    const { service, getRecurringWooCommerceSyncJob, scheduleRecurringWooCommerceSyncJob } =
      createSchedulingMocks();
    const scheduledAt = new Date("2026-07-03T15:00:00.000Z");
    getRecurringWooCommerceSyncJob.mockResolvedValue(null);
    scheduleRecurringWooCommerceSyncJob.mockResolvedValue({
      everyMs: 3_600_000,
      jobId: "amazon-seller:auto:full-sync:store_1",
      platform: StorePlatform.AmazonSeller,
      scheduledAt,
      status: "SCHEDULED",
      storeId: "store_1",
    });

    await expect(
      service.scheduleAutomaticSync(
        {
          id: "store_1",
          connectionStatus: StoreConnectionStatus.Connected,
          platform: StorePlatform.AmazonSeller,
        },
        "user_1",
      ),
    ).resolves.toEqual({
      everyMs: 3_600_000,
      jobId: "amazon-seller:auto:full-sync:store_1",
      platform: StorePlatform.AmazonSeller,
      scheduledAt,
      status: "SCHEDULED",
      storeId: "store_1",
    });
    expect(scheduleRecurringWooCommerceSyncJob).toHaveBeenCalledWith({
      data: expect.objectContaining({
        platform: StorePlatform.AmazonSeller,
        requestedByUserId: "user_1",
        resource: "all",
        storeId: "store_1",
      }),
      everyMs: 3_600_000,
      jobId: "amazon-seller:auto:full-sync:store_1",
      name: "amazon-seller.manual.full-sync",
    });
  });

  it("creates a recurring sync schedule for a connected TikTok Shop store", async () => {
    const { service, getRecurringWooCommerceSyncJob, scheduleRecurringWooCommerceSyncJob } =
      createSchedulingMocks();
    const scheduledAt = new Date("2026-07-03T15:00:00.000Z");
    getRecurringWooCommerceSyncJob.mockResolvedValue(null);
    scheduleRecurringWooCommerceSyncJob.mockResolvedValue({
      everyMs: 3_600_000,
      jobId: "tiktok-shop:auto:full-sync:store_1",
      platform: StorePlatform.TikTokShop,
      scheduledAt,
      status: "SCHEDULED",
      storeId: "store_1",
    });

    await expect(
      service.scheduleAutomaticSync(
        {
          id: "store_1",
          connectionStatus: StoreConnectionStatus.Connected,
          platform: StorePlatform.TikTokShop,
        },
        "user_1",
      ),
    ).resolves.toEqual({
      everyMs: 3_600_000,
      jobId: "tiktok-shop:auto:full-sync:store_1",
      platform: StorePlatform.TikTokShop,
      scheduledAt,
      status: "SCHEDULED",
      storeId: "store_1",
    });
    expect(scheduleRecurringWooCommerceSyncJob).toHaveBeenCalledWith({
      data: expect.objectContaining({
        platform: StorePlatform.TikTokShop,
        requestedByUserId: "user_1",
        resource: "all",
        storeId: "store_1",
      }),
      everyMs: 3_600_000,
      jobId: "tiktok-shop:auto:full-sync:store_1",
      name: "tiktok-shop.manual.full-sync",
    });
  });

  it("creates a recurring sync schedule for a connected Shopify store", async () => {
    const { service, getRecurringWooCommerceSyncJob, scheduleRecurringWooCommerceSyncJob } =
      createSchedulingMocks();
    const scheduledAt = new Date("2026-07-03T15:00:00.000Z");
    getRecurringWooCommerceSyncJob.mockResolvedValue(null);
    scheduleRecurringWooCommerceSyncJob.mockResolvedValue({
      everyMs: 3_600_000,
      jobId: "shopify:auto:full-sync:store_1",
      platform: StorePlatform.Shopify,
      scheduledAt,
      status: "SCHEDULED",
      storeId: "store_1",
    });

    await expect(
      service.scheduleAutomaticSync(
        {
          id: "store_1",
          connectionStatus: StoreConnectionStatus.Connected,
          platform: StorePlatform.Shopify,
        },
        "user_1",
      ),
    ).resolves.toEqual({
      everyMs: 3_600_000,
      jobId: "shopify:auto:full-sync:store_1",
      platform: StorePlatform.Shopify,
      scheduledAt,
      status: "SCHEDULED",
      storeId: "store_1",
    });
    expect(scheduleRecurringWooCommerceSyncJob).toHaveBeenCalledWith({
      data: expect.objectContaining({
        platform: StorePlatform.Shopify,
        requestedByUserId: "user_1",
        resource: "all",
        storeId: "store_1",
      }),
      everyMs: 3_600_000,
      jobId: "shopify:auto:full-sync:store_1",
      name: "shopify.manual.full-sync",
    });
  });

  it("prevents duplicate recurring schedules", async () => {
    const { service, getRecurringWooCommerceSyncJob, scheduleRecurringWooCommerceSyncJob } =
      createSchedulingMocks();
    getRecurringWooCommerceSyncJob.mockResolvedValue({
      everyMs: 3_600_000,
      jobId: "woocommerce:auto:full-sync:store_1",
      platform: StorePlatform.WooCommerce,
      storeId: "store_1",
    });

    await expect(
      service.scheduleAutomaticSync(
        {
          id: "store_1",
          connectionStatus: StoreConnectionStatus.Connected,
          platform: StorePlatform.WooCommerce,
        },
        "user_1",
      ),
    ).rejects.toThrow(ConflictException);
    expect(scheduleRecurringWooCommerceSyncJob).not.toHaveBeenCalled();
  });

  it("removes a recurring sync schedule without exposing credentials", async () => {
    const { service, removeRecurringWooCommerceSyncJob } = createSchedulingMocks();
    const removedAt = new Date("2026-07-03T16:00:00.000Z");
    removeRecurringWooCommerceSyncJob.mockResolvedValue({
      jobId: "woocommerce:auto:full-sync:store_1",
      platform: StorePlatform.WooCommerce,
      removedAt,
      status: "REMOVED",
      storeId: "store_1",
      encryptedCredential: "should-not-leak",
    });

    const response = await service.removeAutomaticSync({
      id: "store_1",
      connectionStatus: StoreConnectionStatus.Disconnected,
      platform: StorePlatform.WooCommerce,
    });

    expect(removeRecurringWooCommerceSyncJob).toHaveBeenCalledWith(
      "woocommerce:auto:full-sync:store_1",
      "store_1",
    );
    expect(response).toEqual({
      jobId: "woocommerce:auto:full-sync:store_1",
      platform: StorePlatform.WooCommerce,
      removedAt,
      status: "REMOVED",
      storeId: "store_1",
    });
    expect(JSON.stringify(response)).not.toContain("should-not-leak");
  });
});
