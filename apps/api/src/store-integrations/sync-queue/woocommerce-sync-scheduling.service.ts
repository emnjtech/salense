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
  createWooCommerceRecurringSyncJobId,
  SYNC_QUEUE,
  WooCommerceSyncJobName,
  type RecurringSyncScheduleRemovalResult,
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
    const schedule =
      store.platform === StorePlatform.AmazonSeller
        ? await this.syncQueue.scheduleRecurringWooCommerceSyncJob({
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
          })
        : await this.syncQueue.scheduleRecurringWooCommerceSyncJob({
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
          });

    return toScheduleResponse(schedule);
  }

  async removeAutomaticSync(store: SchedulableConnectedStore): Promise<SyncScheduleRemovalResponse> {
    if (!isSchedulablePlatform(store.platform)) {
      throw new BadRequestException("Scheduled sync is currently available for WooCommerce and Amazon Seller stores only.");
    }

    const removal = await this.syncQueue.removeRecurringWooCommerceSyncJob(
      createRecurringSyncJobId(store),
      store.id,
    );

    return toScheduleRemovalResponse(removal);
  }

  private assertSchedulableStore(store: SchedulableConnectedStore): void {
    if (!isSchedulablePlatform(store.platform)) {
      throw new BadRequestException("Scheduled sync is currently available for WooCommerce and Amazon Seller stores only.");
    }

    if (store.connectionStatus !== StoreConnectionStatus.Connected) {
      throw new ConflictException("Store must be connected before automatic synchronisation can be scheduled.");
    }
  }
}

function isSchedulablePlatform(platform: StorePlatform): boolean {
  return platform === StorePlatform.WooCommerce || platform === StorePlatform.AmazonSeller;
}

function createRecurringSyncJobId(store: SchedulableConnectedStore): string {
  return store.platform === StorePlatform.AmazonSeller
    ? createAmazonSellerRecurringSyncJobId(store.id)
    : createWooCommerceRecurringSyncJobId(store.id);
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
