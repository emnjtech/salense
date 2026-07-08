import type { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";

export type IntelligenceSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH";
export type IntelligenceDirection = "UP" | "DOWN" | "FLAT" | "UNKNOWN";
export type ConfidenceLevel = "LOW" | "MEDIUM" | "HIGH";

export interface IntelligenceEvidence {
  readonly metric: string;
  readonly value: number | string;
  readonly source: "normalized_orders" | "normalized_products" | "normalized_customers" | "normalized_inventory" | "normalized_refunds" | "connected_stores";
}

export interface IntelligenceObject {
  readonly id: string;
  readonly type: "OBSERVATION" | "DIAGNOSTIC" | "RECOMMENDATION" | "FORECAST" | "BUSINESS_HEALTH";
  readonly title: string;
  readonly summary: string;
  readonly severity: IntelligenceSeverity;
  readonly evidence: readonly IntelligenceEvidence[];
}

export interface ObservationObject extends IntelligenceObject {
  readonly type: "OBSERVATION";
  readonly category: "REVENUE" | "ORDERS" | "PLATFORM" | "INVENTORY" | "CUSTOMER" | "REFUND";
  readonly direction: IntelligenceDirection;
}

export interface DiagnosticObject extends IntelligenceObject {
  readonly type: "DIAGNOSTIC";
  readonly driver: "INVENTORY" | "PLATFORM_CONCENTRATION" | "REFUNDS" | "DATA_COVERAGE" | "SALES_MOMENTUM";
}

export interface RecommendationObject extends IntelligenceObject {
  readonly type: "RECOMMENDATION";
  readonly priority: "LOW" | "MEDIUM" | "HIGH";
  readonly actionType: "REVIEW_INVENTORY" | "REVIEW_PLATFORM" | "REVIEW_REFUNDS" | "MONITOR_TREND" | "CONNECT_MORE_CHANNELS";
}

export interface ForecastObject extends IntelligenceObject {
  readonly type: "FORECAST";
  readonly horizon: "NEXT_7_DAYS";
  readonly direction: IntelligenceDirection;
}

export interface BusinessHealthContributor {
  readonly name: string;
  readonly status: "GOOD" | "AT_RISK" | "NEEDS_DATA";
  readonly summary: string;
}

export interface BusinessHealthObject extends IntelligenceObject {
  readonly type: "BUSINESS_HEALTH";
  readonly score: number | null;
  readonly status: "GOOD" | "AT_RISK" | "INSUFFICIENT_DATA";
  readonly contributors: readonly BusinessHealthContributor[];
}

export interface ConfidenceObject {
  readonly level: ConfidenceLevel;
  readonly score: number;
  readonly summary: string;
  readonly factors: readonly string[];
}

export interface ExplainabilityObject {
  readonly dataSources: readonly string[];
  readonly rulesApplied: readonly string[];
  readonly limitations: readonly string[];
  readonly safetyConstraints: readonly string[];
}

export interface AiBusinessOverview {
  readonly businessId: string;
  readonly businessName: string;
  readonly connectedStores: number;
  readonly connectedPlatforms: readonly StorePlatform[];
  readonly synchronizedStores: number;
  readonly revenueToday: number;
  readonly revenueYesterday: number;
  readonly ordersToday: number;
  readonly refundsToday: number;
  readonly productsTracked: number;
  readonly customersTracked: number;
  readonly lowStockProducts: number;
  readonly outOfStockProducts: number;
}

export interface AiBriefingTodayResponse {
  readonly status: "READY" | "INSUFFICIENT_DATA";
  readonly message?: string;
  readonly generatedAt: string;
  readonly businessOverview?: AiBusinessOverview;
  readonly executiveSummary?: string;
  readonly observations: readonly ObservationObject[];
  readonly risks: readonly DiagnosticObject[];
  readonly opportunities: readonly DiagnosticObject[];
  readonly recommendations: readonly RecommendationObject[];
  readonly forecasts: readonly ForecastObject[];
  readonly businessHealth?: BusinessHealthObject;
  readonly confidence?: ConfidenceObject;
  readonly explainability?: ExplainabilityObject;
}
