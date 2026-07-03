import type { StorePlatform } from "./store-platform.enum.js";

export interface SyncScheduleResponse {
  readonly everyMs: number;
  readonly jobId: string;
  readonly platform: StorePlatform;
  readonly scheduledAt: Date;
  readonly status: "SCHEDULED";
  readonly storeId: string;
}

export interface SyncScheduleRemovalResponse {
  readonly jobId: string;
  readonly platform: StorePlatform;
  readonly removedAt: Date;
  readonly status: "REMOVED" | "NOT_FOUND";
  readonly storeId: string;
}
