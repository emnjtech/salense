import { fetchWithSessionRefresh } from "../auth-session";
import {
  getDefaultApiBaseUrl,
  type StoreConnectionStatus,
  type StorePlatform,
} from "./store-integrations-client";

export interface PlatformSummary {
  readonly platform: StorePlatform;
  readonly platformName: string;
  readonly connectedStores: readonly PlatformStoreSummary[];
  readonly metrics: {
    readonly averageOrderValue: number;
    readonly lowStockCount: number;
    readonly orders: number;
    readonly productsSold: number;
    readonly refunds: number;
    readonly revenue: number;
  };
  readonly recentOrders: readonly PlatformRecentOrder[];
  readonly topProducts: readonly PlatformTopProduct[];
  readonly inventoryAlerts: readonly PlatformInventoryAlert[];
  readonly syncStatus: readonly PlatformSyncStatus[];
}

export interface PlatformStoreSummary {
  readonly id: string;
  readonly connectionStatus: StoreConnectionStatus;
  readonly lastSynchronisedAt: string | null;
  readonly region: string | null;
  readonly storeName: string;
  readonly storeUrl: string | null;
}

export interface PlatformRecentOrder {
  readonly currency: string | null;
  readonly orderDate: string | null;
  readonly orderId: string;
  readonly orderNumber: string;
  readonly status: string | null;
  readonly storeName: string;
  readonly totalValue: number | null;
}

export interface PlatformTopProduct {
  readonly name: string;
  readonly platformProductId: string | null;
  readonly quantitySold: number;
  readonly revenue: number;
  readonly sku: string | null;
}

export interface PlatformInventoryAlert {
  readonly currentStock: number | null;
  readonly productId: string;
  readonly productName: string | null;
  readonly sku: string | null;
  readonly stockStatus: string | null;
  readonly storeName: string;
}

export interface PlatformSyncStatus {
  readonly lastAttemptedSyncedAt: string | null;
  readonly lastSuccessfulSyncedAt: string | null;
  readonly resource: string;
  readonly status: string;
}

export interface PlatformsApiClient {
  getPlatformSummary(accessToken: string, platform: StorePlatform): Promise<PlatformSummary>;
}

export class PlatformsClientError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PlatformsClientError";
    this.status = status;
  }
}

interface PlatformsApiClientOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

export function createPlatformsApiClient(
  options: PlatformsApiClientOptions = {},
): PlatformsApiClient {
  const baseUrl = trimTrailingSlash(options.baseUrl ?? getDefaultApiBaseUrl());
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async getPlatformSummary(accessToken, platform) {
      const response = await fetchWithSessionRefresh(
        `${baseUrl}/commerce/platforms/${platform}/summary`,
        { headers: {} },
        { accessToken, baseUrl, fetchImpl },
      );

      if (!response.ok) {
        throw new PlatformsClientError(await getErrorMessage(response), response.status);
      }

      return (await response.json()) as PlatformSummary;
    },
  };
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { readonly message?: unknown };

    if (typeof body.message === "string") {
      return body.message;
    }

    if (Array.isArray(body.message)) {
      return body.message.filter((message) => typeof message === "string").join(" ");
    }
  } catch {
    return `Request failed with status ${response.status}.`;
  }

  return `Request failed with status ${response.status}.`;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, "");
}
