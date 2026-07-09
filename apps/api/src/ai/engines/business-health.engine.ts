import { Injectable } from "@nestjs/common";
import { calculateSharedBusinessHealth } from "../../commerce/business-health.js";
import type { BusinessHealthObject } from "../types/ai-objects.type.js";
import type { AiMetrics } from "../types/ai-source-data.type.js";

@Injectable()
export class BusinessHealthEngine {
  generate(metrics: AiMetrics): BusinessHealthObject {
    const health = calculateSharedBusinessHealth({
      connectedPlatforms: metrics.connectedPlatforms.length,
      lowStockProducts: metrics.lowStockProducts,
      outOfStockProducts: metrics.outOfStockProducts,
      refundsToday: metrics.refundsToday,
      revenueLast7Days: metrics.revenueLast7Days,
      revenueToday: metrics.revenueToday,
    });

    return {
      id: "business-health-today",
      type: "BUSINESS_HEALTH",
      title: "Business Health Score",
      summary: health.summary,
      severity: health.status === "GOOD" ? "INFO" : "MEDIUM",
      score: health.score,
      status: health.status,
      contributors: health.contributors,
      evidence: [
        { metric: "revenueLast7Days", value: metrics.revenueLast7Days, source: "normalized_orders" },
        { metric: "connectedPlatforms", value: metrics.connectedPlatforms.length, source: "connected_stores" },
        { metric: "lowStockProducts", value: metrics.lowStockProducts, source: "normalized_products" },
        { metric: "refundsToday", value: metrics.refundsToday, source: "normalized_refunds" },
      ],
    };
  }
}
