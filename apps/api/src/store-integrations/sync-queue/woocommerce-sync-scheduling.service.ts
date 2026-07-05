import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import { StoreConnectionStatus } from "../types/store-connection-status.enum.js";
import { StorePlatform } from "../types/store-platform.enum.js";
import type {
  SyncScheduleRemovalResponse,
  SyncScheduleResponse,
} from "../types/sync-schedule-response.type.js";
import {
  AmazonSellerSyncJobName,
  createAmazonSellerRecurringSyncJobId,
  createShopifyRecurringSyncJobId,
  createTikTokShopRecurringSyncJobId,
  createWooCommerceRecurringSyncJobId,
  SYNC_QUEUE,
  ShopifySyncJobName,
  TikTokShopSyncJobName,
  WooCommerceSyncJobName,
  type RecurringSyncScheduleRemovalResult,
  type RecurringSyncScheduleRequest,
  type RecurringSyncScheduleResult,
  type SyncQueuePort,
} from "./sync-queue.types.js";
import { loadSyncScheduleConfig } from "./sync-schedule.config.js";

export interface SchedulableConnectedStore {
  readonly id: string;
  readonly connectionStatus: StoreConnectionStatus;
  readonly platform: StorePlatform;
}

@Injectable()
export class WooCommerceSyncSchedulingService {
  constructor(
    @Inject(SYNC_QUEUE)
    private readonly syncQueue: SyncQueuePort,
  ) {}

  async scheduleAutomaticSync(
    store: SchedulableConnectedStore,
    requestedByUserId: string,
  ): Promise<SyncScheduleResponse> {
    this.assertSchedulableStore(store);

    const jobId = createRecurringSyncJobId(store);
    const existingSchedule = await this.syncQueue.getRecurringWooCommerceSyncJob(jobId);

    if (existingSchedule) {
      throw new ConflictException("Automatic sync is already scheduled for this store.");
    }

    const scheduledAt = new Date();
    const { intervalMs } = loadSyncScheduleConfig();
    const schedule = await this.syncQueue.scheduleRecurringWooCommerceSyncJob(
      createRecurringSyncScheduleRequest(store, requestedByUserId, scheduledAt, intervalMs, jobId),
    );

    return toScheduleResponse(schedule);
  }

  async removeAutomaticSync(store: SchedulableConnectedStore): Promise<SyncScheduleRemovalResponse> {
    if (!isSchedulablePlatform(store.platform)) {
      throw new BadRequestException(syncAvailabilityMessage);
    }

    const removal = await this.syncQueue.removeRecurringWooCommerceSyncJob(
      createRecurringSyncJobId(store),
      store.id,
    );

    return toScheduleRemovalResponse(removal);
  }

  private assertSchedulableStore(store: SchedulableConnectedStore): void {
    if (!isSchedulablePlatform(store.platform)) {
      throw new BadRequestException(syncAvailabilityMessage);
    }

    if (store.connectionStatus !== StoreConnectionStatus.Connected) {
      throw new ConflictException("Store must be connected before automatic synchronisation can be scheduled.");
    }
  }
}

const syncAvailabilityMessage =
  "Scheduled sync is currently available for WooCommerce, Amazon Seller, TikTok Shop, and Shopify stores only.";

function createRecurringSyncScheduleRequest(
  store: SchedulableConnectedStore,
  requestedByUserId: string,
  scheduledAt: Date,
  intervalMs: number,
  jobId: string,
): RecurringSyncScheduleRequest {
  switch (store.platform) {
    case StorePlatform.AmazonSeller:
      return {
        data: {
          platform: StorePlatform.AmazonSeller,
          queuedAt: scheduledAt.toISOString(),
          requestedByUserId,
          resource: "all",
          storeId: store.id,
        },
        everyMs: intervalMs,
        jobId,
        name: AmazonSellerSyncJobName.ManualFullSync,
      };
    case StorePlatform.TikTokShop:
      return {
        data: {
          platform: StorePlatform.TikTokShop,
          queuedAt: scheduledAt.toISOString(),
          requestedByUserId,
          resource: "all",
          storeId: store.id,
        },
        everyMs: intervalMs,
        jobId,
        name: TikTokShopSyncJobName.ManualFullSync,
      };
    case StorePlatform.Shopify:
      return {
        data: {
          platform: StorePlatform.Shopify,
          queuedAt: scheduledAt.toISOString(),
          requestedByUserId,
          resource: "all",
          storeId: store.id,
        },
        everyMs: intervalMs,
        jobId,
        name: ShopifySyncJobName.ManualFullSync,
      };
    case StorePlatform.WooCommerce:
      return {
        data: {
          platform: StorePlatform.WooCommerce,
          queuedAt: scheduledAt.toISOString(),
          requestedByUserId,
          resource: "all",
          storeId: store.id,
        },
        everyMs: intervalMs,
        jobId,
        name: WooCommerceSyncJobName.ManualFullSync,
      };
  }
}

function isSchedulablePlatform(platform: StorePlatform): boolean {
  return (
    platform === StorePlatform.WooCommerce ||
    platform === StorePlatform.AmazonSeller ||
    platform === StorePlatform.TikTokShop ||
    platform === StorePlatform.Shopify
  );
}

function createRecurringSyncJobId(store: SchedulableConnectedStore): string {
  switch (store.platform) {
    case StorePlatform.AmazonSeller:
      return createAmazonSellerRecurringSyncJobId(store.id);
    case StorePlatform.TikTokShop:
      return createTikTokShopRecurringSyncJobId(store.id);
    case StorePlatform.Shopify:
      return createShopifyRecurringSyncJobId(store.id);
    case StorePlatform.WooCommerce:
      return createWooCommerceRecurringSyncJobId(store.id);
  }
}

function toScheduleResponse(schedule: RecurringSyncScheduleResult): SyncScheduleResponse {
  return {
    everyMs: schedule.everyMs,
    jobId: schedule.jobId,
    platform: schedule.platform,
    scheduledAt: schedule.scheduledAt,
    status: "SCHEDULED",
    storeId: schedule.storeId,
  };
}

function toScheduleRemovalResponse(
  removal: RecurringSyncScheduleRemovalResult,
): SyncScheduleRemovalResponse {
  return {
    jobId: removal.jobId,
    platform: removal.platform,
    removedAt: removal.removedAt,
    status: removal.status,
    storeId: removal.storeId,
  };
}
