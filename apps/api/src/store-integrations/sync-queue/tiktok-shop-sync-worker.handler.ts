import { Inject, Injectable } from "@nestjs/common";
import {
  TikTokShopSyncService,
  type TikTokShopFullSyncResult,
  type TikTokShopResourceSyncResult,
} from "../tiktok-shop-sync.service.js";
import {
  TikTokShopSyncJobName,
  type TikTokShopSyncJob,
} from "./sync-queue.types.js";

@Injectable()
export class TikTokShopSyncWorkerHandler {
  constructor(
    @Inject(TikTokShopSyncService)
    private readonly tikTokShopSyncService: TikTokShopSyncService,
  ) {}

  async handle(job: TikTokShopSyncJob): Promise<unknown> {
    switch (job.name) {
      case TikTokShopSyncJobName.ManualFullSync:
        return sanitizeFullSyncResult(await this.tikTokShopSyncService.syncAll(job.data.storeId));
      case TikTokShopSyncJobName.OrdersSync:
        return sanitizeResourceSyncResult(
          await this.tikTokShopSyncService.syncOrders(job.data.storeId),
        );
      case TikTokShopSyncJobName.ProductsSync:
        return sanitizeResourceSyncResult(
          await this.tikTokShopSyncService.syncProducts(job.data.storeId),
        );
      case TikTokShopSyncJobName.CustomersSync:
        return sanitizeResourceSyncResult(
          await this.tikTokShopSyncService.syncCustomers(job.data.storeId),
        );
      case TikTokShopSyncJobName.InventorySync:
        return sanitizeResourceSyncResult(
          await this.tikTokShopSyncService.syncInventory(job.data.storeId),
        );
      case TikTokShopSyncJobName.CategoriesSync:
        return sanitizeResourceSyncResult(
          await this.tikTokShopSyncService.syncCategories(job.data.storeId),
        );
      case TikTokShopSyncJobName.RefundsSync:
        return sanitizeResourceSyncResult(
          await this.tikTokShopSyncService.syncRefunds(job.data.storeId),
        );
      default:
        throw new Error("Unsupported TikTok Shop sync job.");
    }
  }
}

function sanitizeFullSyncResult(result: TikTokShopFullSyncResult): TikTokShopFullSyncResult {
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
  result: TikTokShopResourceSyncResult,
): TikTokShopResourceSyncResult {
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
