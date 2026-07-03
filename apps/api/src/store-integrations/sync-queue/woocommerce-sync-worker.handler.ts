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
    switch (job.name) {
      case WooCommerceSyncJobName.ManualFullSync:
        return sanitizeFullSyncResult(await this.wooCommerceSyncService.syncAll(job.data.storeId));
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
  }
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
