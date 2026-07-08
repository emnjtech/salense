import type {
  AiBusinessOverview,
  BusinessHealthObject,
  ConfidenceObject,
  DiagnosticObject,
  ExplainabilityObject,
  ForecastObject,
  ObservationObject,
  RecommendationObject,
} from "./ai-objects.type.js";

export type PromptType =
  | "DAILY_BRIEFING"
  | "EXECUTIVE_SUMMARY"
  | "RECOMMENDATION_EXPLANATION"
  | "BUSINESS_QUERY";

export interface AiBusinessContextOverview {
  readonly businessName: string;
  readonly connectedStores: number;
  readonly connectedPlatforms: AiBusinessOverview["connectedPlatforms"];
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

export interface AiContextObject {
  readonly contextVersion: "ai-context-v1";
  readonly generatedAt: string;
  readonly businessOverview: AiBusinessContextOverview;
  readonly businessHealth: BusinessHealthObject;
  readonly observations: readonly ObservationObject[];
  readonly diagnostics: {
    readonly risks: readonly DiagnosticObject[];
    readonly opportunities: readonly DiagnosticObject[];
  };
  readonly recommendations: readonly RecommendationObject[];
  readonly forecasts: readonly ForecastObject[];
  readonly confidence: ConfidenceObject;
  readonly explainability: Pick<
    ExplainabilityObject,
    "dataSources" | "rulesApplied" | "limitations" | "safetyConstraints"
  >;
}

export interface PromptMessage {
  readonly role: "system" | "user";
  readonly content: string;
}

export interface PromptTemplate {
  readonly promptVersion: "prompt-v1";
  readonly type: PromptType;
  readonly messages: readonly PromptMessage[];
}

export interface NarrativeGenerationResult {
  readonly narrative: string;
  readonly provider: string;
  readonly model: string;
  readonly promptVersion: PromptTemplate["promptVersion"];
  readonly fallbackUsed: boolean;
}
