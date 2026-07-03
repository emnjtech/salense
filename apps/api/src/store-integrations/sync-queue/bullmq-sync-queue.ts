import { InternalServerErrorException } from "@nestjs/common";
import { Queue, type JobsOptions } from "bullmq";
import { StorePlatform } from "../types/store-platform.enum.js";
import {
  syncQueueName,
  type RecurringSyncScheduleLookupResult,
  type RecurringSyncScheduleRemovalResult,
  type RecurringSyncScheduleRequest,
  type RecurringSyncScheduleResult,
  type SyncJobEnqueueResult,
  type SyncJobStatusResult,
  type SyncQueuePort,
  type WooCommerceSyncJobData,
  type WooCommerceSyncJobName,
} from "./sync-queue.types.js";

const defaultJobOptions = {
  attempts: 3,
  backoff: { delay: 30_000, type: "exponential" },
  removeOnComplete: 100,
  removeOnFail: 500,
} satisfies JobsOptions;

export class BullMqSyncQueue implements SyncQueuePort {
  private queue?: Queue<WooCommerceSyncJobData, unknown, WooCommerceSyncJobName>;

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
      platform: StorePlatform.WooCommerce,
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
        platform: StorePlatform.WooCommerce,
        removedAt: new Date(),
        status: "NOT_FOUND",
        storeId,
      };
    }

    await this.getQueue().removeRepeatableByKey(repeatableJob.key);

    return {
      jobId,
      platform: StorePlatform.WooCommerce,
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

  private getQueue(): Queue<WooCommerceSyncJobData, unknown, WooCommerceSyncJobName> {
    if (!this.queue) {
      const connection = createRedisConnectionOptions();
      this.queue = new Queue<WooCommerceSyncJobData, unknown, WooCommerceSyncJobName>(
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
