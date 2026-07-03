import type { StorePlatform } from "./store-platform.enum.js";

export interface ManualSyncResponse {
  readonly jobId: string;
  readonly platform: StorePlatform;
  readonly queuedAt: Date;
  readonly status: "QUEUED";
  readonly storeId: string;
}

export interface ManualSyncJobStatusResponse {
  readonly failedReason?: string;
  readonly finishedAt?: Date;
  readonly jobId: string;
  readonly platform: StorePlatform;
  readonly queuedAt: Date;
  readonly status: "QUEUED" | "ACTIVE" | "COMPLETED" | "FAILED" | "UNKNOWN";
  readonly storeId: string;
}
