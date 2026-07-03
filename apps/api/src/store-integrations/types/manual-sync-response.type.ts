import type { WooCommerceSyncResource } from "../woocommerce-sync.service.js";
import type { StorePlatform } from "./store-platform.enum.js";

export interface ManualSyncResourceSummary {
  readonly errors: readonly string[];
  readonly records: {
    readonly categories: number;
    readonly customers: number;
    readonly inventorySnapshots: number;
    readonly orderItems: number;
    readonly orders: number;
    readonly products: number;
    readonly refunds: number;
  };
  readonly resource: WooCommerceSyncResource;
  readonly status: "SUCCESS" | "ERROR";
}

export interface ManualSyncResponse {
  readonly errors: readonly string[];
  readonly lastSynchronisedAt: Date;
  readonly platform: StorePlatform;
  readonly resourcesSynced: readonly ManualSyncResourceSummary[];
  readonly status: "SUCCESS" | "PARTIAL_FAILURE" | "ERROR";
  readonly storeId: string;
}
