import { Inject, Injectable } from "@nestjs/common";
import {
  WooCommerceSyncService,
  type WooCommerceFullSyncResult,
  type WooCommerceResourceSyncResult,
} from "../woocommerce-sync.service.js";
import {
  WooCommerceSyncJobName,
  type WooCommerceSyncJob,
} from "./sync-queue.types.js";

@Injectable()
export class WooCommerceSyncWorkerHandler {
  constructor(
    @Inject(WooCommerceSyncService)
    private readonly wooCommerceSyncService: WooCommerceSyncService,
  ) {}

  async handle(job: WooCommerceSyncJob): Promise<unknown> {
    try {
      switch (job.name) {
        case WooCommerceSyncJobName.ManualFullSync:
          return assertFullSyncSucceeded(
            sanitizeFullSyncResult(await this.wooCommerceSyncService.syncAll(job.data.storeId)),
          );
        case WooCommerceSyncJobName.OrdersSync:
          return sanitizeResourceSyncResult(
            await this.wooCommerceSyncService.syncOrders(job.data.storeId),
          );
        case WooCommerceSyncJobName.ProductsSync:
          return sanitizeResourceSyncResult(
            await this.wooCommerceSyncService.syncProducts(job.data.storeId),
          );
        case WooCommerceSyncJobName.CustomersSync:
          return sanitizeResourceSyncResult(
            await this.wooCommerceSyncService.syncCustomers(job.data.storeId),
          );
        case WooCommerceSyncJobName.InventorySync:
          return sanitizeResourceSyncResult(
            await this.wooCommerceSyncService.syncInventory(job.data.storeId),
          );
        case WooCommerceSyncJobName.CategoriesSync:
          return sanitizeResourceSyncResult(
            await this.wooCommerceSyncService.syncCategories(job.data.storeId),
          );
        case WooCommerceSyncJobName.RefundsSync:
          return sanitizeResourceSyncResult(
            await this.wooCommerceSyncService.syncRefunds(job.data.storeId),
          );
        default:
          throw new Error("Unsupported WooCommerce sync job.");
      }
    } catch (error) {
      if (isDisconnectedStoreSyncError(error)) {
        return {
          connectedStoreId: job.data.storeId,
          reason: "WooCommerce store is no longer connected.",
          readOnly: true,
          status: "SKIPPED",
        };
      }

      throw error;
    }
  }
}

function isDisconnectedStoreSyncError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("store must be connected before synchronisation")
  );
}

function assertFullSyncSucceeded(result: WooCommerceFullSyncResult): WooCommerceFullSyncResult {
  if (result.status === "ERROR") {
    throw new Error(result.errors[0] ?? "WooCommerce full sync failed.");
  }

  return result;
}

function sanitizeFullSyncResult(result: WooCommerceFullSyncResult): WooCommerceFullSyncResult {
  return {
    connectedStoreId: result.connectedStoreId,
    errors: result.errors,
    readOnly: true,
    resources: result.resources.map(sanitizeResourceSyncResult),
    status: result.status,
    syncedAt: result.syncedAt,
  };
}

function sanitizeResourceSyncResult(
  result: WooCommerceResourceSyncResult,
): WooCommerceResourceSyncResult {
  return {
    connectedStoreId: result.connectedStoreId,
    errors: result.errors,
    persistence: result.persistence,
    readOnly: true,
    resource: result.resource,
    status: result.status,
    syncedAt: result.syncedAt,
  };
}
