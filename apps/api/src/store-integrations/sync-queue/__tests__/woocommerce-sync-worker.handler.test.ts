import { StorePlatform } from "../../types/store-platform.enum.js";
import type { WooCommerceSyncService } from "../../woocommerce-sync.service.js";
import {
  WooCommerceSyncJobName,
  type WooCommerceSyncJob,
} from "../sync-queue.types.js";
import { WooCommerceSyncWorkerHandler } from "../woocommerce-sync-worker.handler.js";

function createHandlerMocks(): {
  readonly handler: WooCommerceSyncWorkerHandler;
  readonly syncAll: jest.Mock;
  readonly syncOrders: jest.Mock;
  readonly syncProducts: jest.Mock;
  readonly syncCustomers: jest.Mock;
  readonly syncInventory: jest.Mock;
  readonly syncCategories: jest.Mock;
  readonly syncRefunds: jest.Mock;
} {
  const syncAll = jest.fn();
  const syncOrders = jest.fn();
  const syncProducts = jest.fn();
  const syncCustomers = jest.fn();
  const syncInventory = jest.fn();
  const syncCategories = jest.fn();
  const syncRefunds = jest.fn();
  const wooCommerceSyncService = {
    syncAll,
    syncCategories,
    syncCustomers,
    syncInventory,
    syncOrders,
    syncProducts,
    syncRefunds,
  } as unknown as WooCommerceSyncService;

  return {
    handler: new WooCommerceSyncWorkerHandler(wooCommerceSyncService),
    syncAll,
    syncCategories,
    syncCustomers,
    syncInventory,
    syncOrders,
    syncProducts,
    syncRefunds,
  };
}

function createJob(name: WooCommerceSyncJobName): WooCommerceSyncJob {
  return {
    data: {
      platform: StorePlatform.WooCommerce,
      queuedAt: "2026-07-03T14:00:00.000Z",
      requestedByUserId: "user_1",
      resource: "all",
      storeId: "store_1",
    },
    name,
  } as unknown as WooCommerceSyncJob;
}

describe("WooCommerceSyncWorkerHandler", () => {
  it.each([
    [WooCommerceSyncJobName.ManualFullSync, "syncAll"],
    [WooCommerceSyncJobName.OrdersSync, "syncOrders"],
    [WooCommerceSyncJobName.ProductsSync, "syncProducts"],
    [WooCommerceSyncJobName.CustomersSync, "syncCustomers"],
    [WooCommerceSyncJobName.InventorySync, "syncInventory"],
    [WooCommerceSyncJobName.CategoriesSync, "syncCategories"],
    [WooCommerceSyncJobName.RefundsSync, "syncRefunds"],
  ] as const)("calls WooCommerceSyncService.%s safely", async (jobName, methodName) => {
    const mocks = createHandlerMocks();
    mocks[methodName].mockResolvedValue(
      methodName === "syncAll"
        ? {
            connectedStoreId: "store_1",
            errors: [],
            readOnly: true,
            resources: [],
            status: "SUCCESS",
            syncedAt: new Date("2026-07-03T14:00:00.000Z"),
          }
        : {
            connectedStoreId: "store_1",
            errors: [],
            persistence: {
              categories: 0,
              customers: 0,
              inventorySnapshots: 0,
              orderItems: 0,
              orders: 0,
              products: 0,
              refunds: 0,
            },
            readOnly: true,
            resource: "orders",
            status: "SUCCESS",
            syncedAt: new Date("2026-07-03T14:00:00.000Z"),
          },
    );

    await mocks.handler.handle(createJob(jobName));

    expect(mocks[methodName]).toHaveBeenCalledWith("store_1");
  });

  it("returns failed sync results without exposing credentials", async () => {
    const { handler, syncAll } = createHandlerMocks();
    syncAll.mockResolvedValue({
      connectedStoreId: "store_1",
      errors: ["WooCommerce timeout"],
      readOnly: true,
      resources: [],
      status: "ERROR",
      syncedAt: new Date("2026-07-03T14:00:00.000Z"),
      accessTokenHash: "should-not-leak",
      encryptedCredential: "should-not-leak",
    });

    const response = await handler.handle(createJob(WooCommerceSyncJobName.ManualFullSync));

    expect(response).toMatchObject({
      connectedStoreId: "store_1",
      errors: ["WooCommerce timeout"],
      status: "ERROR",
    });
    expect(JSON.stringify(response)).not.toContain("should-not-leak");
  });
});
