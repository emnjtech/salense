import type { Job } from "bullmq";
export {
  AmazonSellerSyncJobName,
  amazonSellerSyncJobNames,
  createAmazonSellerRecurringSyncJobId,
  createTikTokShopRecurringSyncJobId,
  createWooCommerceRecurringSyncJobId,
  defaultSyncScheduleIntervalMs,
  syncQueueName,
  TikTokShopSyncJobName,
  tikTokShopSyncJobNames,
  WooCommerceSyncJobName,
  wooCommerceSyncJobNames,
} from "@salense/shared";
import type {
  AmazonSellerSyncJobName,
  TikTokShopSyncJobName,
  WooCommerceSyncJobName,
} from "@salense/shared";
import type { StorePlatform } from "../types/store-platform.enum.js";
import type { AmazonSellerSyncResource } from "../amazon-seller-sync.service.js";
import type { TikTokShopSyncResource } from "../tiktok-shop-sync.service.js";
import type { WooCommerceSyncResource } from "../woocommerce-sync.service.js";

export const SYNC_QUEUE = Symbol("SYNC_QUEUE");

export interface WooCommerceSyncJobData {
  readonly platform: StorePlatform.WooCommerce;
  readonly queuedAt: string;
  readonly requestedByUserId: string;
  readonly resource: WooCommerceSyncResource | "all";
  readonly storeId: string;
}

export interface AmazonSellerSyncJobData {
  readonly platform: StorePlatform.AmazonSeller;
  readonly queuedAt: string;
  readonly requestedByUserId: string;
  readonly resource: AmazonSellerSyncResource | "all";
  readonly storeId: string;
}

export interface TikTokShopSyncJobData {
  readonly platform: StorePlatform.TikTokShop;
  readonly queuedAt: string;
  readonly requestedByUserId: string;
  readonly resource: TikTokShopSyncResource | "all";
  readonly storeId: string;
}

export type WooCommerceSyncJob = Job<
  WooCommerceSyncJobData,
  unknown,
  WooCommerceSyncJobName
>;

export type AmazonSellerSyncJob = Job<
  AmazonSellerSyncJobData,
  unknown,
  AmazonSellerSyncJobName
>;

export type TikTokShopSyncJob = Job<
  TikTokShopSyncJobData,
  unknown,
  TikTokShopSyncJobName
>;

export type SyncJobData = WooCommerceSyncJobData | AmazonSellerSyncJobData | TikTokShopSyncJobData;
export type SyncJobName = WooCommerceSyncJobName | AmazonSellerSyncJobName | TikTokShopSyncJobName;

type ActiveSyncPlatform =
  | StorePlatform.WooCommerce
  | StorePlatform.AmazonSeller
  | StorePlatform.TikTokShop;

export interface SyncJobEnqueueResult {
  readonly jobId: string;
  readonly platform: ActiveSyncPlatform;
  readonly queuedAt: Date;
  readonly status: "QUEUED";
  readonly storeId: string;
}

export interface SyncJobStatusResult {
  readonly failedReason?: string;
  readonly finishedAt?: Date;
  readonly jobId: string;
  readonly platform: ActiveSyncPlatform;
  readonly queuedAt: Date;
  readonly status: "QUEUED" | "ACTIVE" | "COMPLETED" | "FAILED" | "UNKNOWN";
  readonly storeId: string;
}

export interface StoreSyncJobStatusResult {
  readonly failedReason?: string;
  readonly finishedAt?: Date;
  readonly jobId: string;
  readonly platform: ActiveSyncPlatform;
  readonly queuedAt: Date;
  readonly status: "QUEUED" | "ACTIVE" | "COMPLETED" | "FAILED" | "UNKNOWN";
  readonly storeId: string;
}

export interface RecurringSyncScheduleRequest {
  readonly everyMs: number;
  readonly jobId: string;
  readonly name: SyncJobName;
  readonly data: SyncJobData;
}

export interface RecurringSyncScheduleResult {
  readonly everyMs: number;
  readonly jobId: string;
  readonly platform: ActiveSyncPlatform;
  readonly scheduledAt: Date;
  readonly status: "SCHEDULED";
  readonly storeId: string;
}

export interface RecurringSyncScheduleLookupResult {
  readonly everyMs: number;
  readonly jobId: string;
  readonly platform: ActiveSyncPlatform;
  readonly storeId: string;
}

export interface RecurringSyncScheduleRemovalResult {
  readonly jobId: string;
  readonly platform: ActiveSyncPlatform;
  readonly removedAt: Date;
  readonly status: "REMOVED" | "NOT_FOUND";
  readonly storeId: string;
}

export interface SyncQueuePort {
  enqueueWooCommerceSyncJob(
    name: WooCommerceSyncJobName,
    data: WooCommerceSyncJobData,
  ): Promise<SyncJobEnqueueResult>;
  enqueueAmazonSellerSyncJob(
    name: AmazonSellerSyncJobName,
    data: AmazonSellerSyncJobData,
  ): Promise<SyncJobEnqueueResult>;
  enqueueTikTokShopSyncJob(
    name: TikTokShopSyncJobName,
    data: TikTokShopSyncJobData,
  ): Promise<SyncJobEnqueueResult>;
  getJobStatus(jobId: string): Promise<SyncJobStatusResult | null>;
  getWooCommerceStoreJobStatuses(
    storeId: string,
  ): Promise<readonly StoreSyncJobStatusResult[]>;
  getAmazonSellerStoreJobStatuses(
    storeId: string,
  ): Promise<readonly StoreSyncJobStatusResult[]>;
  getTikTokShopStoreJobStatuses(
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
