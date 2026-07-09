import { bootstrapSyncWorker } from "../index.js";
import type { SyncWorkerLike } from "../sync-worker.js";

describe("worker bootstrap", () => {
  it("fails safely when Redis config is missing", async () => {
    await expect(bootstrapSyncWorker({ env: {} })).rejects.toThrow(
      "REDIS_URL is required to start the Salense sync worker.",
    );
  });

  it("starts and closes a sync worker without exposing credentials", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const handlerContextClose = jest.fn().mockResolvedValue(undefined);
    const loadHandlerContext = jest.fn().mockResolvedValue({
      close: handlerContextClose,
      handler: { handle: jest.fn() },
    });
    const workerClose = jest.fn().mockResolvedValue(undefined);
    const on = jest.fn().mockReturnThis();
    const workerFactory = jest.fn((): SyncWorkerLike => ({ close: workerClose, on }));

    const runningWorker = await bootstrapSyncWorker({
      env: { REDIS_URL: "redis://user:super-secret@localhost:6379/0" },
      loadHandlerContext,
      workerFactory,
    });

    expect(workerFactory).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Function),
      expect.objectContaining({
        connection: expect.objectContaining({ host: "localhost", port: 6379 }),
      }),
    );
    expect(on).toHaveBeenCalledWith("failed", expect.any(Function));
    const failedListener = on.mock.calls.find(([event]) => event === "failed")?.[1] as
      | ((job: {
          readonly data?: {
            readonly platform?: string;
            readonly resource?: string;
            readonly storeId?: string;
          };
          readonly failedReason?: string;
          readonly id: string;
        }) => void)
      | undefined;
    failedListener?.({
      data: { platform: "WOOCOMMERCE", resource: "all", storeId: "store_1" },
      failedReason: "WooCommerce credentials are not configured.",
      id: "job_1",
    });
    expect(consoleError).toHaveBeenCalledWith(
      'Sync job failed: job_1 platform=WOOCOMMERCE store=store_1 resource=all category=CREDENTIAL_CONFIGURATION reason="WooCommerce credentials are not configured."',
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("super-secret");

    await runningWorker.close();

    expect(workerClose).toHaveBeenCalled();
    expect(handlerContextClose).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
