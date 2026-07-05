import { Inject, Injectable } from "@nestjs/common";
import {
  ShopifySyncService,
  type ShopifyFullSyncResult,
  type ShopifyResourceSyncResult,
} from "../shopify-sync.service.js";
import {
  ShopifySyncJobName,
  type ShopifySyncJob,
} from "./sync-queue.types.js";

@Injectable()
export class ShopifySyncWorkerHandler {
  constructor(
    @Inject(ShopifySyncService)
    private readonly shopifySyncService: ShopifySyncService,
  ) {}

  async handle(job: ShopifySyncJob): Promise<unknown> {
    switch (job.name) {
      case ShopifySyncJobName.ManualFullSync:
        return sanitizeFullSyncResult(await this.shopifySyncService.syncAll(job.data.storeId));
      case ShopifySyncJobName.OrdersSync:
        return sanitizeResourceSyncResult(
          await this.shopifySyncService.syncOrders(job.data.storeId),
        );
      case ShopifySyncJobName.ProductsSync:
        return sanitizeResourceSyncResult(
          await this.shopifySyncService.syncProducts(job.data.storeId),
        );
      case ShopifySyncJobName.CustomersSync:
        return sanitizeResourceSyncResult(
          await this.shopifySyncService.syncCustomers(job.data.storeId),
        );
      case ShopifySyncJobName.InventorySync:
        return sanitizeResourceSyncResult(
          await this.shopifySyncService.syncInventory(job.data.storeId),
        );
      case ShopifySyncJobName.CategoriesSync:
        return sanitizeResourceSyncResult(
          await this.shopifySyncService.syncCategories(job.data.storeId),
        );
      case ShopifySyncJobName.RefundsSync:
        return sanitizeResourceSyncResult(
          await this.shopifySyncService.syncRefunds(job.data.storeId),
        );
      default:
        throw new Error("Unsupported Shopify sync job.");
    }
  }
}

function sanitizeFullSyncResult(result: ShopifyFullSyncResult): ShopifyFullSyncResult {
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
  result: ShopifyResourceSyncResult,
): ShopifyResourceSyncResult {
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
