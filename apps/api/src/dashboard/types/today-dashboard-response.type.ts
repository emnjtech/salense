import type { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";

export interface PlatformMetric {
  readonly platform: StorePlatform;
  readonly value: number;
}

export interface TopProductToday {
  readonly name: string;
  readonly platform: StorePlatform;
  readonly quantitySold: number;
  readonly revenue: number;
  readonly sku: string | null;
}

export interface RuleBasedInsight {
  readonly message: string;
  readonly severity: "INFO" | "WARNING" | "SUCCESS";
  readonly type: "CONNECTION" | "INVENTORY" | "REVENUE" | "SALES";
}

export interface BusinessHealthContributorSummary {
  readonly name: string;
  readonly status: "GOOD" | "AT_RISK" | "NEEDS_DATA";
  readonly summary: string;
}

export interface TodayDashboardResponse {
  readonly activeStores: number;
  readonly averageOrderValueToday: number;
  readonly basicBusinessHealthContributors: readonly BusinessHealthContributorSummary[];
  readonly basicBusinessHealthScore: number | null;
  readonly basicBusinessHealthStatus: "GOOD" | "AT_RISK" | "INSUFFICIENT_DATA";
  readonly basicBusinessHealthSummary: string;
  readonly basicRuleBasedInsights: readonly RuleBasedInsight[];
  readonly bestPlatformToday: StorePlatform | null;
  readonly businessName: string;
  readonly hasCommerceData: boolean;
  readonly connectedPlatforms: readonly StorePlatform[];
  readonly lowStockCount: number;
  readonly ordersByPlatform: readonly PlatformMetric[];
  readonly ordersToday: number;
  readonly productsSoldToday: number;
  readonly refundCountToday: number;
  readonly revenueByPlatform: readonly PlatformMetric[];
  readonly revenueChangePercent: number | null;
  readonly todayRevenue: number;
  readonly topProductToday: TopProductToday | null;
  readonly yesterdayRevenue: number;
}
