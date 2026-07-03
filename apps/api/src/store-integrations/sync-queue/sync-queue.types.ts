import type { Job } from "bullmq";
import type { StorePlatform } from "../types/store-platform.enum.js";
import type { WooCommerceSyncResource } from "../woocommerce-sync.service.js";

export const SYNC_QUEUE = Symbol("SYNC_QUEUE");

export const syncQueueName = "salense-sync";

export enum WooCommerceSyncJobName {
  ManualFullSync = "woocommerce.manual.full-sync",
  OrdersSync = "woocommerce.orders.sync",
  ProductsSync = "woocommerce.products.sync",
  CustomersSync = "woocommerce.customers.sync",
  InventorySync = "woocommerce.inventory.sync",
  CategoriesSync = "woocommerce.categories.sync",
  RefundsSync = "woocommerce.refunds.sync",
}

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
