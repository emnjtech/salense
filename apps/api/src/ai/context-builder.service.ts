import { Injectable } from "@nestjs/common";
import type {
  AiBusinessOverview,
  BusinessHealthObject,
  ConfidenceObject,
  DiagnosticObject,
  ExplainabilityObject,
  ForecastObject,
  ObservationObject,
  RecommendationObject,
} from "./types/ai-objects.type.js";
import type { AiContextObject } from "./types/ai-context.type.js";

export interface BuildContextInput {
  readonly generatedAt: string;
  readonly businessOverview: AiBusinessOverview;
  readonly businessHealth: BusinessHealthObject;
  readonly observations: readonly ObservationObject[];
  readonly risks: readonly DiagnosticObject[];
  readonly opportunities: readonly DiagnosticObject[];
  readonly recommendations: readonly RecommendationObject[];
  readonly forecasts: readonly ForecastObject[];
  readonly confidence: ConfidenceObject;
  readonly explainability: ExplainabilityObject;
}

@Injectable()
export class ContextBuilderService {
  build(input: BuildContextInput): AiContextObject {
    return {
      contextVersion: "ai-context-v1",
      generatedAt: input.generatedAt,
      businessOverview: {
        businessName: input.businessOverview.businessName,
        connectedStores: input.businessOverview.connectedStores,
        connectedPlatforms: input.businessOverview.connectedPlatforms,
        synchronizedStores: input.businessOverview.synchronizedStores,
        revenueToday: input.businessOverview.revenueToday,
        revenueYesterday: input.businessOverview.revenueYesterday,
        ordersToday: input.businessOverview.ordersToday,
        refundsToday: input.businessOverview.refundsToday,
        productsTracked: input.businessOverview.productsTracked,
        customersTracked: input.businessOverview.customersTracked,
        lowStockProducts: input.businessOverview.lowStockProducts,
        outOfStockProducts: input.businessOverview.outOfStockProducts,
      },
      businessHealth: input.businessHealth,
      observations: input.observations,
      diagnostics: {
        risks: input.risks,
        opportunities: input.opportunities,
      },
      recommendations: input.recommendations,
      forecasts: input.forecasts,
      confidence: input.confidence,
      explainability: {
        dataSources: input.explainability.dataSources,
        rulesApplied: input.explainability.rulesApplied,
        limitations: input.explainability.limitations,
        safetyConstraints: input.explainability.safetyConstraints,
      },
    };
  }
}
