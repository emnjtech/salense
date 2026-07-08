import type { StoreConnectionStatus } from "../../store-integrations/types/store-connection-status.enum.js";
import type { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";

export interface CommercePlatformSummaryResponse {
  readonly platform: StorePlatform;
  readonly platformName: string;
  readonly connectedStores: readonly CommercePlatformStoreSummary[];
  readonly metrics: {
    readonly averageOrderValue: number;
    readonly lowStockCount: number;
    readonly orders: number;
    readonly productsSold: number;
    readonly refunds: number;
    readonly revenue: number;
  };
  readonly recentOrders: readonly CommercePlatformRecentOrder[];
  readonly topProducts: readonly CommercePlatformTopProduct[];
  readonly inventoryAlerts: readonly CommercePlatformInventoryAlert[];
  readonly syncStatus: readonly CommercePlatformSyncStatus[];
}

export interface CommercePlatformStoreSummary {
  readonly id: string;
  readonly connectionStatus: StoreConnectionStatus;
  readonly lastSynchronisedAt: string | null;
  readonly region: string | null;
  readonly storeName: string;
  readonly storeUrl: string | null;
}

export interface CommercePlatformRecentOrder {
  readonly currency: string | null;
  readonly orderDate: string | null;
  readonly orderId: string;
  readonly orderNumber: string;
  readonly revenueEligible: boolean;
  readonly status: string | null;
  readonly storeName: string;
  readonly totalValue: number | null;
}

export interface CommercePlatformTopProduct {
  readonly name: string;
  readonly platformProductId: string | null;
  readonly quantitySold: number;
  readonly revenue: number;
  readonly sku: string | null;
}

export interface CommercePlatformInventoryAlert {
  readonly currentStock: number | null;
  readonly productId: string;
  readonly productName: string | null;
  readonly sku: string | null;
  readonly stockStatus: string | null;
  readonly storeName: string;
}

export interface CommercePlatformSyncStatus {
  readonly resource: string;
  readonly status: string;
  readonly lastAttemptedSyncedAt: string | null;
  readonly lastSuccessfulSyncedAt: string | null;
}
