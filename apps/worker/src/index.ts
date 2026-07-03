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
    connection: config.redis,
    handler: handlerContext.handler,
    ...(options.workerFactory ? { workerFactory: options.workerFactory } : {}),
  });

  worker.on("failed", (job) => {
    const jobId = typeof job === "object" && job !== null && "id" in job ? String(job.id) : "unknown";
    console.error(`Sync job failed: ${jobId}`);
  });

  return {
    close: async () => {
      await worker.close();
      await handlerContext.close();
    },
    worker,
  };
}
