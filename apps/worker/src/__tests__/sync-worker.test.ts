import type { Job, WorkerOptions } from "bullmq";
import { syncQueueName, WooCommerceSyncJobName } from "@salense/shared";
import type { WooCommerceSyncJobData } from "../api-handler-loader.js";
import { createSyncWorker, processWooCommerceSyncJob, type SyncWorkerLike } from "../sync-worker.js";

function createJob(input: Partial<Job<WooCommerceSyncJobData, unknown, WooCommerceSyncJobName>>) {
  return {
    data: {
      platform: "WOOCOMMERCE",
      queuedAt: "2026-07-03T14:00:00.000Z",
      requestedByUserId: "user_1",
      resource: "all",
      storeId: "store_1",
    },
    id: "job_1",
    name: WooCommerceSyncJobName.ManualFullSync,
    ...input,
  } as Job<WooCommerceSyncJobData, unknown, WooCommerceSyncJobName>;
}

describe("sync worker", () => {
  it("registers the WooCommerce job handler on the sync queue", async () => {
    const handler = { handle: jest.fn().mockResolvedValue({ status: "SUCCESS" }) };
    const close = jest.fn().mockResolvedValue(undefined);
    const on = jest.fn().mockReturnThis();
    let registeredProcessor:
      | ((job: Job<WooCommerceSyncJobData, unknown, WooCommerceSyncJobName>) => Promise<unknown>)
      | undefined;
    const workerFactory = jest.fn(
      (
        queueName: string,
        processor: (job: Job<WooCommerceSyncJobData, unknown, WooCommerceSyncJobName>) => Promise<unknown>,
        options: WorkerOptions,
      ): SyncWorkerLike => {
        expect(queueName).toBe(syncQueueName);
        expect(options.connection).toEqual({ host: "localhost", port: 6379 });
        registeredProcessor = processor;
        return { close, on };
      },
    );

    createSyncWorker({
      connection: { host: "localhost", port: 6379 },
      handler,
      workerFactory,
    });

    expect(workerFactory).toHaveBeenCalledWith(
      syncQueueName,
      expect.any(Function),
      expect.objectContaining({ connection: { host: "localhost", port: 6379 } }),
    );
    await expect(registeredProcessor?.(createJob({}))).resolves.toEqual({ status: "SUCCESS" });
    expect(handler.handle).toHaveBeenCalledWith(expect.objectContaining({ id: "job_1" }));
  });

  it("rejects unsupported job names before calling the handler", async () => {
    const handler = { handle: jest.fn() };

    await expect(
      processWooCommerceSyncJob(createJob({ name: "amazon.sync" as WooCommerceSyncJobName }), handler),
    ).rejects.toThrow("Unsupported sync job type.");
    expect(handler.handle).not.toHaveBeenCalled();
  });

  it("rejects unsupported platforms before calling the handler", async () => {
    const handler = { handle: jest.fn() };

    await expect(
      processWooCommerceSyncJob(
        createJob({ data: { ...createJob({}).data, platform: "AMAZON_SELLER" as "WOOCOMMERCE" } }),
        handler,
      ),
    ).rejects.toThrow("Unsupported sync job platform.");
    expect(handler.handle).not.toHaveBeenCalled();
  });
});
