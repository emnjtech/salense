import type { Job } from "bullmq";
export {
  createWooCommerceRecurringSyncJobId,
  defaultSyncScheduleIntervalMs,
  syncQueueName,
  WooCommerceSyncJobName,
  wooCommerceSyncJobNames,
} from "@salense/shared";
import type { WooCommerceSyncJobName } from "@salense/shared";
import type { StorePlatform } from "../types/store-platform.enum.js";
import type { WooCommerceSyncResource } from "../woocommerce-sync.service.js";

export const SYNC_QUEUE = Symbol("SYNC_QUEUE");

export interface WooCommerceSyncJobData {
  readonly platform: StorePlatform.WooCommerce;
  readonly queuedAt: string;
  readonly requestedByUserId: string;
  readonly resource: WooCommerceSyncResource | "all";
  readonly storeId: string;
}

export type WooCommerceSyncJob = Job<
  WooCommerceSyncJobData,
  unknown,
  WooCommerceSyncJobName
>;

export interface SyncJobEnqueueResult {
  readonly jobId: string;
  readonly platform: StorePlatform.WooCommerce;
  readonly queuedAt: Date;
  readonly status: "QUEUED";
  readonly storeId: string;
}

export interface SyncJobStatusResult {
  readonly failedReason?: string;
  readonly finishedAt?: Date;
  readonly jobId: string;
  readonly platform: StorePlatform.WooCommerce;
  readonly queuedAt: Date;
  readonly status: "QUEUED" | "ACTIVE" | "COMPLETED" | "FAILED" | "UNKNOWN";
  readonly storeId: string;
}

export interface StoreSyncJobStatusResult {
  readonly failedReason?: string;
  readonly finishedAt?: Date;
  readonly jobId: string;
  readonly platform: StorePlatform.WooCommerce;
  readonly queuedAt: Date;
  readonly status: "QUEUED" | "ACTIVE" | "COMPLETED" | "FAILED" | "UNKNOWN";
  readonly storeId: string;
}

export interface RecurringSyncScheduleRequest {
  readonly everyMs: number;
  readonly jobId: string;
  readonly name: WooCommerceSyncJobName;
  readonly data: WooCommerceSyncJobData;
}

export interface RecurringSyncScheduleResult {
  readonly everyMs: number;
  readonly jobId: string;
  readonly platform: StorePlatform.WooCommerce;
  readonly scheduledAt: Date;
  readonly status: "SCHEDULED";
  readonly storeId: string;
}

export interface RecurringSyncScheduleLookupResult {
  readonly everyMs: number;
  readonly jobId: string;
  readonly platform: StorePlatform.WooCommerce;
  readonly storeId: string;
}

export interface RecurringSyncScheduleRemovalResult {
  readonly jobId: string;
  readonly platform: StorePlatform.WooCommerce;
  readonly removedAt: Date;
  readonly status: "REMOVED" | "NOT_FOUND";
  readonly storeId: string;
}

export interface SyncQueuePort {
  enqueueWooCommerceSyncJob(
    name: WooCommerceSyncJobName,
    data: WooCommerceSyncJobData,
  ): Promise<SyncJobEnqueueResult>;
  getJobStatus(jobId: string): Promise<SyncJobStatusResult | null>;
  getWooCommerceStoreJobStatuses(
    storeId: string,
  ): Promise<readonly StoreSyncJobStatusResult[]>;
  getRecurringWooCommerceSyncJob(
    jobId: string,
  ): Promise<RecurringSyncScheduleLookupResult | null>;
  removeRecurringWooCommerceSyncJob(
    jobId: string,
    storeId: string,
  ): Promise<RecurringSyncScheduleRemovalResult>;
  scheduleRecurringWooCommerceSyncJob(
    request: RecurringSyncScheduleRequest,
  ): Promise<RecurringSyncScheduleResult>;
}
