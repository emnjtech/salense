import type { StoreConnectionStatus } from "./store-connection-status.enum.js";
import type { StorePlatform } from "./store-platform.enum.js";

export interface DisconnectStoreResponse {
  readonly storeId: string;
  readonly platform: StorePlatform;
  readonly status: StoreConnectionStatus.Disconnected;
  readonly disconnectedAt: Date | null;
}
