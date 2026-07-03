import type { StorePlatform } from "../types/store-platform.enum.js";

export enum CommerceSyncCursorResource {
  Orders = "ORDERS",
  Products = "PRODUCTS",
  Customers = "CUSTOMERS",
  Inventory = "INVENTORY",
  Categories = "CATEGORIES",
  Refunds = "REFUNDS",
}

export enum CommerceSyncCursorStatus {
  Error = "ERROR",
  Success = "SUCCESS",
}

export interface CommerceSyncCursorRecord {
  readonly businessId: string;
  readonly connectedStoreId: string;
  readonly errorMetadata: Readonly<Record<string, unknown>> | null;
  readonly lastAttemptedSyncedAt: Date | null;
  readonly lastSuccessfulSyncedAt: Date | null;
  readonly platform: StorePlatform;
  readonly resource: CommerceSyncCursorResource;
  readonly status: CommerceSyncCursorStatus;
}
