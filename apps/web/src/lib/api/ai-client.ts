import { fetchWithSessionRefresh } from "../auth-session";
import { getDefaultApiBaseUrl, type StorePlatform } from "./store-integrations-client";

export type IntelligenceSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH";
export type IntelligenceDirection = "UP" | "DOWN" | "FLAT" | "UNKNOWN";
export type ConfidenceLevel = "LOW" | "MEDIUM" | "HIGH";

export interface IntelligenceEvidence {
  readonly metric: string;
  readonly value: number | string;
  readonly source:
    | "normalized_orders"
    | "normalized_products"
    | "normalized_customers"
    | "normalized_inventory"
    | "normalized_refunds"
    | "connected_stores";
}

export interface ObservationObject {
  readonly id: string;
  readonly type: "OBSERVATION";
  readonly title: string;
  readonly summary: string;
  readonly severity: IntelligenceSeverity;
  readonly evidence: readonly IntelligenceEvidence[];
  readonly category: "REVENUE" | "ORDERS" | "PLATFORM" | "INVENTORY" | "CUSTOMER" | "REFUND";
  readonly direction: IntelligenceDirection;
}

export interface DiagnosticObject {
  readonly id: string;
  readonly type: "DIAGNOSTIC";
  readonly title: string;
  readonly summary: string;
  readonly severity: IntelligenceSeverity;
  readonly evidence: readonly IntelligenceEvidence[];
  readonly driver:
    | "INVENTORY"
    | "PLATFORM_CONCENTRATION"
    | "REFUNDS"
    | "DATA_COVERAGE"
    | "SALES_MOMENTUM";
}

export interface RecommendationObject {
  readonly id: string;
  readonly type: "RECOMMENDATION";
  readonly title: string;
  readonly summary: string;
  readonly severity: IntelligenceSeverity;
  readonly evidence: readonly IntelligenceEvidence[];
  readonly priority: "LOW" | "MEDIUM" | "HIGH";
  readonly actionType:
    | "REVIEW_INVENTORY"
    | "REVIEW_PLATFORM"
    | "REVIEW_REFUNDS"
    | "MONITOR_TREND"
    | "CONNECT_MORE_CHANNELS";
}

export interface ForecastObject {
  readonly id: string;
  readonly type: "FORECAST";
  readonly title: string;
  readonly summary: string;
  readonly severity: IntelligenceSeverity;
  readonly evidence: readonly IntelligenceEvidence[];
  readonly horizon: "NEXT_7_DAYS";
  readonly direction: IntelligenceDirection;
}

export interface BusinessHealthContributor {
  readonly name: string;
  readonly status: "GOOD" | "AT_RISK" | "NEEDS_DATA";
  readonly summary: string;
}

export interface BusinessHealthObject {
  readonly id: string;
  readonly type: "BUSINESS_HEALTH";
  readonly title: string;
  readonly summary: string;
  readonly severity: IntelligenceSeverity;
  readonly evidence: readonly IntelligenceEvidence[];
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

export interface AiApiClient {
  getTodayBriefing(accessToken: string): Promise<AiBriefingTodayResponse>;
}

export class AiClientError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AiClientError";
    this.status = status;
  }
}

interface AiApiClientOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

export function createAiApiClient(options: AiApiClientOptions = {}): AiApiClient {
  const baseUrl = trimTrailingSlash(options.baseUrl ?? getDefaultApiBaseUrl());
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async getTodayBriefing(accessToken) {
      const response = await fetchWithSessionRefresh(
        `${baseUrl}/ai/briefing/today`,
        { headers: {} },
        { accessToken, baseUrl, fetchImpl },
      );

      if (!response.ok) {
        throw new AiClientError(await getErrorMessage(response), response.status);
      }

      return (await response.json()) as AiBriefingTodayResponse;
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
    return "We could not load Salense Intelligence. Please try again.";
  }

  return "We could not load Salense Intelligence. Please try again.";
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, "");
}
