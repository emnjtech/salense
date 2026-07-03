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

export interface TodayDashboardResponse {
  readonly activeStores: number;
  readonly averageOrderValueToday: number;
  readonly basicBusinessHealthScore: number;
  readonly basicRuleBasedInsights: readonly RuleBasedInsight[];
  readonly bestPlatformToday: StorePlatform | null;
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
