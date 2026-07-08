import { Injectable } from "@nestjs/common";
import type { ConfidenceObject } from "../types/ai-objects.type.js";
import type { AiMetrics, AiSourceData } from "../types/ai-source-data.type.js";

@Injectable()
export class ConfidenceEngine {
  generate(data: AiSourceData, metrics: AiMetrics): ConfidenceObject {
    let score = 35;
    const factors: string[] = [];

    if (metrics.synchronizedStores > 0) {
      score += 20;
      factors.push("At least one connected store has synchronized successfully.");
    }

    if (metrics.revenueEligibleOrders >= 10) {
      score += 20;
      factors.push("Revenue calculations are based on at least ten revenue-eligible orders.");
    } else {
      factors.push("Order history is still limited.");
    }

    if (metrics.productsTracked > 0) {
      score += 10;
      factors.push("Product data is available.");
    }

    if (metrics.customersTracked > 0) {
      score += 10;
      factors.push("Customer data is available.");
    }

    if (data.connectedStores.length > metrics.synchronizedStores) {
      score -= 10;
      factors.push("Some connected stores have not synchronized yet.");
    }

    const boundedScore = Math.max(0, Math.min(100, score));
    const level = boundedScore >= 75 ? "HIGH" : boundedScore >= 50 ? "MEDIUM" : "LOW";

    return {
      level,
      score: boundedScore,
      summary: `Confidence is ${level.toLowerCase()} because the briefing is based on normalized synchronized commerce records.`,
      factors,
    };
  }
}
