import type { AmazonSellerSyncService } from "../../amazon-seller-sync.service.js";
import { StorePlatform } from "../../types/store-platform.enum.js";
import { AmazonSellerSyncWorkerHandler } from "../amazon-seller-sync-worker.handler.js";
import {
  AmazonSellerSyncJobName,
  type AmazonSellerSyncJob,
} from "../sync-queue.types.js";

function createHandlerMocks(): {
  readonly handler: AmazonSellerSyncWorkerHandler;
  readonly syncAll: jest.Mock;
  readonly syncCategories: jest.Mock;
  readonly syncCustomers: jest.Mock;
  readonly syncInventory: jest.Mock;
  readonly syncOrders: jest.Mock;
  readonly syncProducts: jest.Mock;
  readonly syncRefunds: jest.Mock;
} {
  const syncAll = jest.fn();
  const syncOrders = jest.fn();
  const syncProducts = jest.fn();
  const syncCustomers = jest.fn();
  const syncInventory = jest.fn();
  const syncCategories = jest.fn();
  const syncRefunds = jest.fn();
  const amazonSellerSyncService = {
    syncAll,
    syncCategories,
    syncCustomers,
    syncInventory,
    syncOrders,
    syncProducts,
    syncRefunds,
  } as unknown as AmazonSellerSyncService;

  return {
    handler: new AmazonSellerSyncWorkerHandler(amazonSellerSyncService),
    syncAll,
    syncCategories,
    syncCustomers,
    syncInventory,
    syncOrders,
    syncProducts,
    syncRefunds,
  };
}

function createJob(name: AmazonSellerSyncJobName): AmazonSellerSyncJob {
  return {
    data: {
      platform: StorePlatform.AmazonSeller,
      queuedAt: "2026-07-03T14:00:00.000Z",
      requestedByUserId: "user_1",
      resource: "all",
      storeId: "store_amazon_1",
    },
    name,
  } as unknown as AmazonSellerSyncJob;
}

describe("AmazonSellerSyncWorkerHandler", () => {
  it.each([
    [AmazonSellerSyncJobName.ManualFullSync, "syncAll"],
    [AmazonSellerSyncJobName.OrdersSync, "syncOrders"],
    [AmazonSellerSyncJobName.ProductsSync, "syncProducts"],
    [AmazonSellerSyncJobName.CustomersSync, "syncCustomers"],
    [AmazonSellerSyncJobName.InventorySync, "syncInventory"],
    [AmazonSellerSyncJobName.CategoriesSync, "syncCategories"],
    [AmazonSellerSyncJobName.RefundsSync, "syncRefunds"],
  ] as const)("calls AmazonSellerSyncService.%s safely", async (jobName, methodName) => {
    const mocks = createHandlerMocks();
    mocks[methodName].mockResolvedValue(
      methodName === "syncAll"
        ? {
            connectedStoreId: "store_amazon_1",
            errors: [],
            readOnly: true,
            resources: [],
            status: "SUCCESS",
            syncedAt: new Date("2026-07-03T14:00:00.000Z"),
          }
        : {
            connectedStoreId: "store_amazon_1",
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

    expect(mocks[methodName]).toHaveBeenCalledWith("store_amazon_1");
  });

  it("returns failed sync results without exposing credentials", async () => {
    const { handler, syncAll } = createHandlerMocks();
    syncAll.mockResolvedValue({
      accessTokenHash: "should-not-leak",
      connectedStoreId: "store_amazon_1",
      encryptedCredential: "should-not-leak",
      errors: ["Amazon Seller timeout"],
      readOnly: true,
      resources: [],
      status: "ERROR",
      syncedAt: new Date("2026-07-03T14:00:00.000Z"),
    });

    const response = await handler.handle(createJob(AmazonSellerSyncJobName.ManualFullSync));

    expect(response).toMatchObject({
      connectedStoreId: "store_amazon_1",
      errors: ["Amazon Seller timeout"],
      status: "ERROR",
    });
    expect(JSON.stringify(response)).not.toContain("should-not-leak");
  });
});
