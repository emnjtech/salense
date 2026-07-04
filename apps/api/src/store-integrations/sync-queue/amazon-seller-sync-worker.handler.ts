import { Inject, Injectable } from "@nestjs/common";
import {
  AmazonSellerSyncService,
  type AmazonSellerFullSyncResult,
  type AmazonSellerResourceSyncResult,
} from "../amazon-seller-sync.service.js";
import {
  AmazonSellerSyncJobName,
  type AmazonSellerSyncJob,
} from "./sync-queue.types.js";

@Injectable()
export class AmazonSellerSyncWorkerHandler {
  constructor(
    @Inject(AmazonSellerSyncService)
    private readonly amazonSellerSyncService: AmazonSellerSyncService,
  ) {}

  async handle(job: AmazonSellerSyncJob): Promise<unknown> {
    switch (job.name) {
      case AmazonSellerSyncJobName.ManualFullSync:
        return sanitizeFullSyncResult(await this.amazonSellerSyncService.syncAll(job.data.storeId));
      case AmazonSellerSyncJobName.OrdersSync:
        return sanitizeResourceSyncResult(
          await this.amazonSellerSyncService.syncOrders(job.data.storeId),
        );
      case AmazonSellerSyncJobName.ProductsSync:
        return sanitizeResourceSyncResult(
          await this.amazonSellerSyncService.syncProducts(job.data.storeId),
        );
      case AmazonSellerSyncJobName.CustomersSync:
        return sanitizeResourceSyncResult(
          await this.amazonSellerSyncService.syncCustomers(job.data.storeId),
        );
      case AmazonSellerSyncJobName.InventorySync:
        return sanitizeResourceSyncResult(
          await this.amazonSellerSyncService.syncInventory(job.data.storeId),
        );
      case AmazonSellerSyncJobName.CategoriesSync:
        return sanitizeResourceSyncResult(
          await this.amazonSellerSyncService.syncCategories(job.data.storeId),
        );
      case AmazonSellerSyncJobName.RefundsSync:
        return sanitizeResourceSyncResult(
          await this.amazonSellerSyncService.syncRefunds(job.data.storeId),
        );
      default:
        throw new Error("Unsupported Amazon Seller sync job.");
    }
  }
}

function sanitizeFullSyncResult(result: AmazonSellerFullSyncResult): AmazonSellerFullSyncResult {
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
  result: AmazonSellerResourceSyncResult,
): AmazonSellerResourceSyncResult {
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
