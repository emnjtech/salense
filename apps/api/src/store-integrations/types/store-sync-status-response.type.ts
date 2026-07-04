import type {
  CommerceSyncCursorResource,
  CommerceSyncCursorStatus,
} from "../sync-cursors/commerce-sync-cursor.types.js";
import type { StoreConnectionStatus } from "./store-connection-status.enum.js";
import type { StorePlatform } from "./store-platform.enum.js";

export interface StoreSyncCursorStatusResponse {
  readonly errorSummary: Readonly<Record<string, unknown>> | null;
  readonly lastAttemptedSyncedAt: Date | null;
  readonly lastSuccessfulSyncedAt: Date | null;
  readonly resource: CommerceSyncCursorResource;
  readonly status: CommerceSyncCursorStatus | "NOT_STARTED";
}

export interface StoreSyncJobStatusResponse {
  readonly failedReason?: string;
  readonly finishedAt?: Date;
  readonly jobId: string;
  readonly platform: StorePlatform.WooCommerce | StorePlatform.AmazonSeller;
  readonly queuedAt: Date;
  readonly status: "QUEUED" | "ACTIVE" | "COMPLETED" | "FAILED" | "UNKNOWN";
  readonly storeId: string;
}

export interface StoreSyncStatusResponse {
  readonly connectionStatus: StoreConnectionStatus;
  readonly cursors: readonly StoreSyncCursorStatusResponse[];
  readonly jobs: readonly StoreSyncJobStatusResponse[];
  readonly lastSynchronisedAt: Date | null;
  readonly platform: StorePlatform;
  readonly storeId: string;
}
