import { loadWooCommerceSyncJobHandlerContext } from "./api-handler-loader.js";
import { loadSyncWorkerConfig, type SyncWorkerConfig } from "./config.js";
import { createSyncWorker, type SyncWorkerFactory, type SyncWorkerLike } from "./sync-worker.js";

export const workerAppName = "@salense/worker";

export interface RunningSyncWorker {
  readonly close: () => Promise<void>;
  readonly worker: SyncWorkerLike;
}

export interface BootstrapSyncWorkerOptions {
  readonly config?: SyncWorkerConfig;
  readonly env?: NodeJS.ProcessEnv;
  readonly loadHandlerContext?: typeof loadWooCommerceSyncJobHandlerContext;
  readonly workerFactory?: SyncWorkerFactory;
}

export async function bootstrapSyncWorker(
  options: BootstrapSyncWorkerOptions = {},
): Promise<RunningSyncWorker> {
  const config = options.config ?? loadSyncWorkerConfig(options.env);
  const handlerContext = await (options.loadHandlerContext ?? loadWooCommerceSyncJobHandlerContext)();
  const worker = createSyncWorker({
    ...(handlerContext.amazonSellerHandler
      ? { amazonSellerHandler: handlerContext.amazonSellerHandler }
      : {}),
    connection: config.redis,
    handler: handlerContext.handler,
    ...(handlerContext.shopifyHandler ? { shopifyHandler: handlerContext.shopifyHandler } : {}),
    ...(handlerContext.tikTokShopHandler
      ? { tikTokShopHandler: handlerContext.tikTokShopHandler }
      : {}),
    ...(options.workerFactory ? { workerFactory: options.workerFactory } : {}),
  });

  worker.on("failed", (job) => {
    const jobId = typeof job === "object" && job !== null && "id" in job ? String(job.id) : "unknown";
    const failedReason = getFailedReason(job);
    const jobData = getSyncJobData(job);

    console.error(
      `Sync job failed: ${jobId} platform=${jobData.platform} store=${jobData.storeId} resource=${jobData.resource} category=${toSafeFailureCategory(failedReason)} reason="${toSafeFailureReason(failedReason)}"`,
    );
  });

  return {
    close: async () => {
      await worker.close();
      await handlerContext.close();
    },
    worker,
  };
}

function getFailedReason(job: unknown): string {
  return typeof job === "object" &&
    job !== null &&
    "failedReason" in job &&
    typeof job.failedReason === "string"
    ? job.failedReason
    : "";
}

function getSyncJobData(job: unknown): {
  readonly platform: string;
  readonly resource: string;
  readonly storeId: string;
} {
  if (typeof job !== "object" || job === null || !("data" in job)) {
    return { platform: "unknown", resource: "unknown", storeId: "unknown" };
  }

  const data = job.data as {
    readonly platform?: unknown;
    readonly resource?: unknown;
    readonly storeId?: unknown;
  };

  return {
    platform: typeof data.platform === "string" ? data.platform : "unknown",
    resource: typeof data.resource === "string" ? data.resource : "unknown",
    storeId: typeof data.storeId === "string" ? data.storeId : "unknown",
  };
}

function toSafeFailureCategory(reason: string): string {
  const normalizedReason = reason.toLowerCase();

  if (normalizedReason.includes("auth")) {
    return "AUTHENTICATION";
  }

  if (
    normalizedReason.includes("decrypt") ||
    normalizedReason.includes("encrypt") ||
    normalizedReason.includes("credential")
  ) {
    return "CREDENTIAL_CONFIGURATION";
  }

  if (
    normalizedReason.includes("unreachable") ||
    normalizedReason.includes("url") ||
    normalizedReason.includes("timeout") ||
    normalizedReason.includes("timed out")
  ) {
    return "STORE_REACHABILITY";
  }

  if (normalizedReason.includes("rate limit")) {
    return "RATE_LIMIT";
  }

  return "SYNC_FAILED";
}

function toSafeFailureReason(reason: string): string {
  const normalizedReason = reason.trim();

  if (!normalizedReason) {
    return "Sync failed without a detailed reason.";
  }

  return normalizedReason
    .replace(/consumer_key=[^&\s")]+/gi, "consumer_key=[redacted]")
    .replace(/consumer_secret=[^&\s")]+/gi, "consumer_secret=[redacted]")
    .replace(/ck_[A-Za-z0-9_]+/g, "ck_[redacted]")
    .replace(/cs_[A-Za-z0-9_]+/g, "cs_[redacted]");
}
