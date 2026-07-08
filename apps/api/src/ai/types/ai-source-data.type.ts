import type { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";

export interface AiBusinessRecord {
  readonly id: string;
  readonly name: string;
}

export interface AiConnectedStoreRecord {
  readonly id: string;
  readonly platform: StorePlatform;
  readonly storeName: string;
  readonly lastSynchronisedAt: Date | null;
}

export interface AiOrderRecord {
  readonly id: string;
  readonly connectedStoreId: string;
  readonly platform: StorePlatform;
  readonly orderStatus: string | null;
  readonly totalAmount: unknown;
  readonly orderedAt: Date | null;
}

export interface AiOrderItemRecord {
  readonly name: string | null;
  readonly platform: StorePlatform;
  readonly platformProductId: string | null;
  readonly quantity: number | null;
  readonly totalAmount: unknown;
  readonly order?: { readonly orderStatus: string | null };
}

export interface AiProductRecord {
  readonly id: string;
  readonly platform: StorePlatform;
  readonly name: string | null;
  readonly stockStatus: string | null;
  readonly currentStockQuantity: number | null;
}

export interface AiCustomerRecord {
  readonly id: string;
  readonly platform: StorePlatform;
}

export interface AiRefundRecord {
  readonly id: string;
  readonly platform: StorePlatform;
  readonly amount: unknown;
  readonly refundedAt: Date | null;
}

export interface AiSourceData {
  readonly business: AiBusinessRecord;
  readonly connectedStores: readonly AiConnectedStoreRecord[];
  readonly orders: readonly AiOrderRecord[];
  readonly orderItems: readonly AiOrderItemRecord[];
  readonly products: readonly AiProductRecord[];
  readonly customers: readonly AiCustomerRecord[];
  readonly refunds: readonly AiRefundRecord[];
  readonly now: Date;
}

export interface AiMetrics {
  readonly connectedPlatforms: readonly StorePlatform[];
  readonly synchronizedStores: number;
  readonly revenueToday: number;
  readonly revenueYesterday: number;
  readonly revenueLast7Days: number;
  readonly ordersToday: number;
  readonly ordersYesterday: number;
  readonly revenueEligibleOrders: number;
  readonly refundsToday: number;
  readonly lowStockProducts: number;
  readonly outOfStockProducts: number;
  readonly productsTracked: number;
  readonly customersTracked: number;
  readonly topPlatformByRevenue: { readonly platform: StorePlatform; readonly revenue: number } | null;
  readonly topProduct: { readonly name: string; readonly revenue: number; readonly unitsSold: number } | null;
}
