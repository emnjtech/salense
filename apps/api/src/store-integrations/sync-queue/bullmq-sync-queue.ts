import { InternalServerErrorException } from "@nestjs/common";
import { Queue, type JobType, type JobsOptions } from "bullmq";
import { StorePlatform } from "../types/store-platform.enum.js";
import {
  syncQueueName,
  type AmazonSellerSyncJobData,
  type AmazonSellerSyncJobName,
  type RecurringSyncScheduleLookupResult,
  type RecurringSyncScheduleRemovalResult,
  type RecurringSyncScheduleRequest,
  type RecurringSyncScheduleResult,
  type SyncJobEnqueueResult,
  type SyncJobStatusResult,
  type SyncQueuePort,
  type StoreSyncJobStatusResult,
  type WooCommerceSyncJobData,
  type WooCommerceSyncJobName,
  type SyncJobData,
  type SyncJobName,
} from "./sync-queue.types.js";

const defaultJobOptions = {
  attempts: 3,
  backoff: { delay: 30_000, type: "exponential" },
  removeOnComplete: 100,
  removeOnFail: 500,
} satisfies JobsOptions;

const storeStatusJobTypes = [
  "active",
  "completed",
  "delayed",
  "failed",
  "prioritized",
  "waiting",
  "waiting-children",
] satisfies JobType[];

export class BullMqSyncQueue implements SyncQueuePort {
  private queue?: Queue<SyncJobData, unknown, SyncJobName>;

  async enqueueWooCommerceSyncJob(
    name: WooCommerceSyncJobName,
    data: WooCommerceSyncJobData,
  ): Promise<SyncJobEnqueueResult> {
    const job = await this.getQueue().add(name, data, defaultJobOptions);

    return {
      jobId: String(job.id),
      platform: data.platform,
      queuedAt: new Date(data.queuedAt),
      status: "QUEUED",
      storeId: data.storeId,
    };
  }

  async enqueueAmazonSellerSyncJob(
    name: AmazonSellerSyncJobName,
    data: AmazonSellerSyncJobData,
  ): Promise<SyncJobEnqueueResult> {
    const job = await this.getQueue().add(name, data, defaultJobOptions);

    return {
      jobId: String(job.id),
      platform: data.platform,
      queuedAt: new Date(data.queuedAt),
      status: "QUEUED",
      storeId: data.storeId,
    };
  }

  async getJobStatus(jobId: string): Promise<SyncJobStatusResult | null> {
    const job = await this.getQueue().getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();

    return {
      ...(job.failedReason ? { failedReason: job.failedReason } : {}),
      ...(job.finishedOn ? { finishedAt: new Date(job.finishedOn) } : {}),
      jobId: String(job.id),
      platform: job.data.platform,
      queuedAt: new Date(job.data.queuedAt),
      status: toSafeJobStatus(state),
      storeId: job.data.storeId,
    };
  }

  async getWooCommerceStoreJobStatuses(
    storeId: string,
  ): Promise<readonly StoreSyncJobStatusResult[]> {
    return this.getStoreJobStatuses(storeId, StorePlatform.WooCommerce);
  }

  async getAmazonSellerStoreJobStatuses(
    storeId: string,
  ): Promise<readonly StoreSyncJobStatusResult[]> {
    return this.getStoreJobStatuses(storeId, StorePlatform.AmazonSeller);
  }

  private async getStoreJobStatuses(
    storeId: string,
    platform: StorePlatform,
  ): Promise<readonly StoreSyncJobStatusResult[]> {
    const jobs = await this.getQueue().getJobs(storeStatusJobTypes, 0, 50, false);

    return Promise.all(
      jobs
        .filter((job) => job.data.storeId === storeId && job.data.platform === platform)
        .map(async (job) => {
          const state = await job.getState();

          return {
            ...(job.failedReason ? { failedReason: job.failedReason } : {}),
            ...(job.finishedOn ? { finishedAt: new Date(job.finishedOn) } : {}),
            jobId: String(job.id),
            platform: job.data.platform,
            queuedAt: new Date(job.data.queuedAt),
            status: toSafeJobStatus(state),
            storeId: job.data.storeId,
          };
        }),
    );
  }

  async getRecurringWooCommerceSyncJob(
    jobId: string,
  ): Promise<RecurringSyncScheduleLookupResult | null> {
    const repeatableJobs = await this.getQueue().getRepeatableJobs();
    const repeatableJob = repeatableJobs.find((job) => job.id === jobId);

    if (!repeatableJob) {
      return null;
    }

    return {
      everyMs: Number(repeatableJob.every ?? 0),
      jobId,
      platform: jobId.startsWith("amazon-seller:")
        ? StorePlatform.AmazonSeller
        : StorePlatform.WooCommerce,
      storeId: storeIdFromRecurringJobId(jobId),
    };
  }

  async removeRecurringWooCommerceSyncJob(
    jobId: string,
    storeId: string,
  ): Promise<RecurringSyncScheduleRemovalResult> {
    const repeatableJobs = await this.getQueue().getRepeatableJobs();
    const repeatableJob = repeatableJobs.find((job) => job.id === jobId);

    if (!repeatableJob) {
      return {
        jobId,
        platform: jobId.startsWith("amazon-seller:")
          ? StorePlatform.AmazonSeller
          : StorePlatform.WooCommerce,
        removedAt: new Date(),
        status: "NOT_FOUND",
        storeId,
      };
    }

    await this.getQueue().removeRepeatableByKey(repeatableJob.key);

    return {
      jobId,
      platform: jobId.startsWith("amazon-seller:")
        ? StorePlatform.AmazonSeller
        : StorePlatform.WooCommerce,
      removedAt: new Date(),
      status: "REMOVED",
      storeId,
    };
  }

  async scheduleRecurringWooCommerceSyncJob(
    request: RecurringSyncScheduleRequest,
  ): Promise<RecurringSyncScheduleResult> {
    await this.getQueue().add(request.name, request.data, {
      ...defaultJobOptions,
      jobId: request.jobId,
      repeat: { every: request.everyMs },
    });

    return {
      everyMs: request.everyMs,
      jobId: request.jobId,
      platform: request.data.platform,
      scheduledAt: new Date(request.data.queuedAt),
      status: "SCHEDULED",
      storeId: request.data.storeId,
    };
  }

  private getQueue(): Queue<SyncJobData, unknown, SyncJobName> {
    if (!this.queue) {
      const connection = createRedisConnectionOptions();
      this.queue = new Queue<SyncJobData, unknown, SyncJobName>(
        syncQueueName,
        { connection },
      );
    }

    return this.queue;
  }
}

function storeIdFromRecurringJobId(jobId: string): string {
  return jobId.split(":").at(-1) ?? jobId;
}

export function createBullMqSyncQueue(): SyncQueuePort {
  return new BullMqSyncQueue();
}

function createRedisConnectionOptions(): {
  readonly db?: number;
  readonly host: string;
  readonly password?: string;
  readonly port: number;
  readonly username?: string;
} {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new InternalServerErrorException("Sync queue Redis configuration is missing.");
  }

  const parsedUrl = new URL(redisUrl);
  const parsedDb = parsedUrl.pathname ? Number.parseInt(parsedUrl.pathname.slice(1), 10) : NaN;

  return {
    ...(Number.isFinite(parsedDb) ? { db: parsedDb } : {}),
    host: parsedUrl.hostname,
    ...(parsedUrl.password ? { password: decodeURIComponent(parsedUrl.password) } : {}),
    port: parsedUrl.port ? Number.parseInt(parsedUrl.port, 10) : 6379,
    ...(parsedUrl.username ? { username: decodeURIComponent(parsedUrl.username) } : {}),
  };
}

function toSafeJobStatus(state: string): SyncJobStatusResult["status"] {
  switch (state) {
    case "active":
      return "ACTIVE";
    case "completed":
      return "COMPLETED";
    case "failed":
      return "FAILED";
    case "delayed":
    case "prioritized":
    case "waiting":
    case "waiting-children":
      return "QUEUED";
    default:
      return "UNKNOWN";
  }
}
