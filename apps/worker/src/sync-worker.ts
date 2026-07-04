import { Worker, type Job, type WorkerOptions } from "bullmq";
import {
  amazonSellerSyncJobNames,
  syncQueueName,
  tikTokShopSyncJobNames,
  wooCommerceSyncJobNames,
  type AmazonSellerSyncJobName,
  type TikTokShopSyncJobName,
  type WooCommerceSyncJobName,
} from "@salense/shared";
import type {
  AmazonSellerSyncJob,
  WooCommerceSyncJob,
  WooCommerceSyncJobData,
  WooCommerceSyncJobHandler,
  AmazonSellerSyncJobHandler,
  SyncJobData,
  TikTokShopSyncJob,
  TikTokShopSyncJobHandler,
} from "./api-handler-loader.js";
import type { RedisConnectionOptions } from "./config.js";

export interface SyncWorkerLike {
  close(): Promise<void>;
  on(event: "completed" | "failed", listener: (...args: readonly unknown[]) => void): this;
}

export type SyncWorkerFactory = (
  queueName: string,
  processor: (
    job: Job<SyncJobData, unknown, WooCommerceSyncJobName | AmazonSellerSyncJobName | TikTokShopSyncJobName>,
  ) => Promise<unknown>,
  options: WorkerOptions,
) => SyncWorkerLike;

export interface CreateSyncWorkerOptions {
  readonly connection: RedisConnectionOptions;
  readonly amazonSellerHandler?: AmazonSellerSyncJobHandler;
  readonly handler: WooCommerceSyncJobHandler;
  readonly tikTokShopHandler?: TikTokShopSyncJobHandler;
  readonly workerFactory?: SyncWorkerFactory;
}

const supportedWooCommerceJobNames = new Set<string>(wooCommerceSyncJobNames);
const supportedAmazonSellerJobNames = new Set<string>(amazonSellerSyncJobNames);
const supportedTikTokShopJobNames = new Set<string>(tikTokShopSyncJobNames);

export function createSyncWorker(options: CreateSyncWorkerOptions): SyncWorkerLike {
  const workerFactory = options.workerFactory ?? createBullMqWorker;

  return workerFactory(
    syncQueueName,
    (job) =>
      processSyncJob(job, options.handler, options.amazonSellerHandler, options.tikTokShopHandler),
    { connection: options.connection },
  );
}

export async function processSyncJob(
  job: Job<SyncJobData, unknown, WooCommerceSyncJobName | AmazonSellerSyncJobName | TikTokShopSyncJobName>,
  wooCommerceHandler: WooCommerceSyncJobHandler,
  amazonSellerHandler?: AmazonSellerSyncJobHandler,
  tikTokShopHandler?: TikTokShopSyncJobHandler,
): Promise<unknown> {
  if (supportedTikTokShopJobNames.has(job.name)) {
    if (!tikTokShopHandler) {
      throw new Error("TikTok Shop sync handler is not available.");
    }

    if (job.data.platform !== "TIKTOK_SHOP") {
      throw new Error("Unsupported sync job platform.");
    }

    return tikTokShopHandler.handle(job as TikTokShopSyncJob);
  }

  if (supportedAmazonSellerJobNames.has(job.name)) {
    if (!amazonSellerHandler) {
      throw new Error("Amazon Seller sync handler is not available.");
    }

    if (job.data.platform !== "AMAZON_SELLER") {
      throw new Error("Unsupported sync job platform.");
    }

    return amazonSellerHandler.handle(job as AmazonSellerSyncJob);
  }

  return processWooCommerceSyncJob(
    job as Job<WooCommerceSyncJobData, unknown, WooCommerceSyncJobName>,
    wooCommerceHandler,
  );
}

export async function processWooCommerceSyncJob(
  job: Job<WooCommerceSyncJobData, unknown, WooCommerceSyncJobName>,
  handler: WooCommerceSyncJobHandler,
): Promise<unknown> {
  if (!supportedWooCommerceJobNames.has(job.name)) {
    throw new Error("Unsupported sync job type.");
  }

  if (job.data.platform !== "WOOCOMMERCE") {
    throw new Error("Unsupported sync job platform.");
  }

  return handler.handle(job as WooCommerceSyncJob);
}

function createBullMqWorker(
  queueName: string,
  processor: (
    job: Job<SyncJobData, unknown, WooCommerceSyncJobName | AmazonSellerSyncJobName | TikTokShopSyncJobName>,
  ) => Promise<unknown>,
  options: WorkerOptions,
): SyncWorkerLike {
  return new Worker<SyncJobData, unknown, WooCommerceSyncJobName | AmazonSellerSyncJobName | TikTokShopSyncJobName>(
    queueName,
    processor,
    options,
  );
}
