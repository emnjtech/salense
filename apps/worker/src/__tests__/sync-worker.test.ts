import type { Job, WorkerOptions } from "bullmq";
import { AmazonSellerSyncJobName, syncQueueName, WooCommerceSyncJobName } from "@salense/shared";
import type { AmazonSellerSyncJobData, SyncJobData, WooCommerceSyncJobData } from "../api-handler-loader.js";
import {
  createSyncWorker,
  processSyncJob,
  processWooCommerceSyncJob,
  type SyncWorkerLike,
} from "../sync-worker.js";

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
  it("registers WooCommerce and Amazon Seller job handlers on the sync queue", async () => {
    const handler = { handle: jest.fn().mockResolvedValue({ status: "SUCCESS" }) };
    const amazonSellerHandler = { handle: jest.fn().mockResolvedValue({ status: "SUCCESS" }) };
    const close = jest.fn().mockResolvedValue(undefined);
    const on = jest.fn().mockReturnThis();
    let registeredProcessor:
      | ((job: Job<SyncJobData, unknown, WooCommerceSyncJobName | AmazonSellerSyncJobName>) => Promise<unknown>)
      | undefined;
    const workerFactory = jest.fn(
      (
        queueName: string,
        processor: (
          job: Job<SyncJobData, unknown, WooCommerceSyncJobName | AmazonSellerSyncJobName>,
        ) => Promise<unknown>,
        options: WorkerOptions,
      ): SyncWorkerLike => {
        expect(queueName).toBe(syncQueueName);
        expect(options.connection).toEqual({ host: "localhost", port: 6379 });
        registeredProcessor = processor;
        return { close, on };
      },
    );

    createSyncWorker({
      amazonSellerHandler,
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

    await expect(
      registeredProcessor?.(
        createAmazonJob({ name: AmazonSellerSyncJobName.ManualFullSync }),
      ),
    ).resolves.toEqual({ status: "SUCCESS" });
    expect(amazonSellerHandler.handle).toHaveBeenCalledWith(expect.objectContaining({ id: "job_amazon_1" }));
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

  it("routes Amazon Seller jobs through the Amazon handler", async () => {
    const wooCommerceHandler = { handle: jest.fn() };
    const amazonSellerHandler = { handle: jest.fn().mockResolvedValue({ status: "SUCCESS" }) };

    await expect(
      processSyncJob(
        createAmazonJob({ name: AmazonSellerSyncJobName.OrdersSync }),
        wooCommerceHandler,
        amazonSellerHandler,
      ),
    ).resolves.toEqual({ status: "SUCCESS" });
    expect(amazonSellerHandler.handle).toHaveBeenCalledWith(expect.objectContaining({ id: "job_amazon_1" }));
    expect(wooCommerceHandler.handle).not.toHaveBeenCalled();
  });

  it("rejects Amazon Seller jobs when the Amazon handler is unavailable", async () => {
    const wooCommerceHandler = { handle: jest.fn() };

    await expect(
      processSyncJob(createAmazonJob({ name: AmazonSellerSyncJobName.OrdersSync }), wooCommerceHandler),
    ).rejects.toThrow("Amazon Seller sync handler is not available.");
    expect(wooCommerceHandler.handle).not.toHaveBeenCalled();
  });
});

function createAmazonJob(
  input: Partial<Job<AmazonSellerSyncJobData, unknown, AmazonSellerSyncJobName>>,
) {
  return {
    data: {
      platform: "AMAZON_SELLER",
      queuedAt: "2026-07-03T14:00:00.000Z",
      requestedByUserId: "user_1",
      resource: "all",
      storeId: "store_amazon_1",
    },
    id: "job_amazon_1",
    name: AmazonSellerSyncJobName.ManualFullSync,
    ...input,
  } as Job<AmazonSellerSyncJobData, unknown, AmazonSellerSyncJobName>;
}
