import type { Job } from "bullmq";
export {
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

export interface SyncQueuePort {
  enqueueWooCommerceSyncJob(
    name: WooCommerceSyncJobName,
    data: WooCommerceSyncJobData,
  ): Promise<SyncJobEnqueueResult>;
  getJobStatus(jobId: string): Promise<SyncJobStatusResult | null>;
}
