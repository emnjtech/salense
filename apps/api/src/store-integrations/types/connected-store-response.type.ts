import type { StoreConnectionStatus } from "./store-connection-status.enum.js";
import type { StorePlatform } from "./store-platform.enum.js";

export interface ConnectedStoreResponse {
  readonly id: string;
  readonly businessId: string;
  readonly platform: StorePlatform;
  readonly storeName: string;
  readonly storeUrl: string | null;
  readonly region: string | null;
  readonly connectionStatus: StoreConnectionStatus;
  readonly lastSynchronisedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
