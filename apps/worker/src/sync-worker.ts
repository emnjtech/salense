import { Worker, type Job, type WorkerOptions } from "bullmq";
import {
  syncQueueName,
  wooCommerceSyncJobNames,
  type WooCommerceSyncJobName,
} from "@salense/shared";
import type {
  WooCommerceSyncJob,
  WooCommerceSyncJobData,
  WooCommerceSyncJobHandler,
} from "./api-handler-loader.js";
import type { RedisConnectionOptions } from "./config.js";

export interface SyncWorkerLike {
  close(): Promise<void>;
  on(event: "completed" | "failed", listener: (...args: readonly unknown[]) => void): this;
}

export type SyncWorkerFactory = (
  queueName: string,
  processor: (job: Job<WooCommerceSyncJobData, unknown, WooCommerceSyncJobName>) => Promise<unknown>,
  options: WorkerOptions,
) => SyncWorkerLike;

export interface CreateSyncWorkerOptions {
  readonly connection: RedisConnectionOptions;
  readonly handler: WooCommerceSyncJobHandler;
  readonly workerFactory?: SyncWorkerFactory;
}

const supportedWooCommerceJobNames = new Set<string>(wooCommerceSyncJobNames);

export function createSyncWorker(options: CreateSyncWorkerOptions): SyncWorkerLike {
  const workerFactory = options.workerFactory ?? createBullMqWorker;

  return workerFactory(
    syncQueueName,
    (job) => processWooCommerceSyncJob(job, options.handler),
    { connection: options.connection },
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
  processor: (job: Job<WooCommerceSyncJobData, unknown, WooCommerceSyncJobName>) => Promise<unknown>,
  options: WorkerOptions,
): SyncWorkerLike {
  return new Worker<WooCommerceSyncJobData, unknown, WooCommerceSyncJobName>(
    queueName,
    processor,
    options,
  );
}
