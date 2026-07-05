import type { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";

export interface ReportsOverviewResponse {
  readonly filters: {
    readonly dateFrom: string;
    readonly dateTo: string;
    readonly platform: StorePlatform | null;
    readonly store: string | null;
  };
  readonly kpis: {
    readonly averageOrderValue: number;
    readonly businessHealthScore: number;
    readonly orders: number;
    readonly refunds: number;
    readonly revenue: number;
  };
  readonly revenueTrend: readonly ReportsTrendPoint[];
  readonly ordersTrend: readonly ReportsTrendPoint[];
  readonly revenueByPlatform: readonly ReportsPlatformMetric[];
  readonly ordersByPlatform: readonly ReportsPlatformMetric[];
  readonly topProducts: readonly ReportsTopProduct[];
  readonly topCustomers: readonly ReportsTopCustomer[];
  readonly inventory: ReportsInventorySummary;
  readonly stores: readonly ReportsStoreFilterOption[];
}

export interface ReportsTrendPoint {
  readonly date: string;
  readonly value: number;
}

export interface ReportsPlatformMetric {
  readonly platform: StorePlatform;
  readonly value: number;
}

export interface ReportsTopProduct {
  readonly inventory: number | null;
  readonly platform: StorePlatform;
  readonly productId: string | null;
  readonly productName: string;
  readonly revenue: number;
  readonly sku: string | null;
  readonly unitsSold: number;
}

export interface ReportsTopCustomer {
  readonly averageOrderValue: number;
  readonly customerId: string | null;
  readonly customerName: string;
  readonly lifetimeSpend: number;
  readonly orders: number;
}

export interface ReportsInventorySummary {
  readonly inventoryRisk: number;
  readonly inventoryValue: number;
  readonly lowStock: number;
  readonly outOfStock: number;
}

export interface ReportsStoreFilterOption {
  readonly id: string;
  readonly platform: StorePlatform;
  readonly storeName: string;
}
