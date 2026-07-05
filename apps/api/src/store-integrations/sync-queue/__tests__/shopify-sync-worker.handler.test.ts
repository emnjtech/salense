import type { ShopifySyncService } from "../../shopify-sync.service.js";
import { StorePlatform } from "../../types/store-platform.enum.js";
import {
  ShopifySyncJobName,
  type ShopifySyncJob,
} from "../sync-queue.types.js";
import { ShopifySyncWorkerHandler } from "../shopify-sync-worker.handler.js";

function createHandlerMocks() {
  const syncAll = jest.fn();
  const syncOrders = jest.fn();
  const syncProducts = jest.fn();
  const syncCustomers = jest.fn();
  const syncInventory = jest.fn();
  const syncCategories = jest.fn();
  const syncRefunds = jest.fn();
  const ShopifySyncService = {
    syncAll,
    syncCategories,
    syncCustomers,
    syncInventory,
    syncOrders,
    syncProducts,
    syncRefunds,
  } as unknown as ShopifySyncService;

  return {
    handler: new ShopifySyncWorkerHandler(ShopifySyncService),
    syncAll,
    syncCategories,
    syncCustomers,
    syncInventory,
    syncOrders,
    syncProducts,
    syncRefunds,
  };
}

function createJob(name: ShopifySyncJobName): ShopifySyncJob {
  return {
    data: {
      platform: StorePlatform.Shopify,
      queuedAt: "2026-07-03T14:00:00.000Z",
      requestedByUserId: "user_1",
      resource: "all",
      storeId: "store_Shopify_1",
    },
    name,
  } as unknown as ShopifySyncJob;
}

describe("ShopifySyncWorkerHandler", () => {
  it.each([
    [ShopifySyncJobName.ManualFullSync, "syncAll"],
    [ShopifySyncJobName.OrdersSync, "syncOrders"],
    [ShopifySyncJobName.ProductsSync, "syncProducts"],
    [ShopifySyncJobName.CustomersSync, "syncCustomers"],
    [ShopifySyncJobName.InventorySync, "syncInventory"],
    [ShopifySyncJobName.CategoriesSync, "syncCategories"],
    [ShopifySyncJobName.RefundsSync, "syncRefunds"],
  ] as const)("calls ShopifySyncService.%s safely", async (jobName, methodName) => {
    const mocks = createHandlerMocks();
    mocks[methodName].mockResolvedValue(
      methodName === "syncAll"
        ? {
            connectedStoreId: "store_Shopify_1",
            errors: [],
            readOnly: true,
            resources: [],
            status: "SUCCESS",
            syncedAt: new Date("2026-07-03T14:00:00.000Z"),
          }
        : {
            connectedStoreId: "store_Shopify_1",
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

    expect(mocks[methodName]).toHaveBeenCalledWith("store_Shopify_1");
  });
});
