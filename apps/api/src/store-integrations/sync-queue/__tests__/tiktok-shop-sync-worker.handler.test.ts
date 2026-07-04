import type { TikTokShopSyncService } from "../../tiktok-shop-sync.service.js";
import { StorePlatform } from "../../types/store-platform.enum.js";
import {
  TikTokShopSyncJobName,
  type TikTokShopSyncJob,
} from "../sync-queue.types.js";
import { TikTokShopSyncWorkerHandler } from "../tiktok-shop-sync-worker.handler.js";

function createHandlerMocks() {
  const syncAll = jest.fn();
  const syncOrders = jest.fn();
  const syncProducts = jest.fn();
  const syncCustomers = jest.fn();
  const syncInventory = jest.fn();
  const syncCategories = jest.fn();
  const syncRefunds = jest.fn();
  const tikTokShopSyncService = {
    syncAll,
    syncCategories,
    syncCustomers,
    syncInventory,
    syncOrders,
    syncProducts,
    syncRefunds,
  } as unknown as TikTokShopSyncService;

  return {
    handler: new TikTokShopSyncWorkerHandler(tikTokShopSyncService),
    syncAll,
    syncCategories,
    syncCustomers,
    syncInventory,
    syncOrders,
    syncProducts,
    syncRefunds,
  };
}

function createJob(name: TikTokShopSyncJobName): TikTokShopSyncJob {
  return {
    data: {
      platform: StorePlatform.TikTokShop,
      queuedAt: "2026-07-03T14:00:00.000Z",
      requestedByUserId: "user_1",
      resource: "all",
      storeId: "store_tiktok_1",
    },
    name,
  } as unknown as TikTokShopSyncJob;
}

describe("TikTokShopSyncWorkerHandler", () => {
  it.each([
    [TikTokShopSyncJobName.ManualFullSync, "syncAll"],
    [TikTokShopSyncJobName.OrdersSync, "syncOrders"],
    [TikTokShopSyncJobName.ProductsSync, "syncProducts"],
    [TikTokShopSyncJobName.CustomersSync, "syncCustomers"],
    [TikTokShopSyncJobName.InventorySync, "syncInventory"],
    [TikTokShopSyncJobName.CategoriesSync, "syncCategories"],
    [TikTokShopSyncJobName.RefundsSync, "syncRefunds"],
  ] as const)("calls TikTokShopSyncService.%s safely", async (jobName, methodName) => {
    const mocks = createHandlerMocks();
    mocks[methodName].mockResolvedValue(
      methodName === "syncAll"
        ? {
            connectedStoreId: "store_tiktok_1",
            errors: [],
            readOnly: true,
            resources: [],
            status: "SUCCESS",
            syncedAt: new Date("2026-07-03T14:00:00.000Z"),
          }
        : {
            connectedStoreId: "store_tiktok_1",
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

    expect(mocks[methodName]).toHaveBeenCalledWith("store_tiktok_1");
  });
});
