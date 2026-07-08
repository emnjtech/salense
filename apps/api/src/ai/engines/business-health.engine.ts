import { Injectable } from "@nestjs/common";
import type { BusinessHealthObject } from "../types/ai-objects.type.js";
import type { AiMetrics } from "../types/ai-source-data.type.js";

@Injectable()
export class BusinessHealthEngine {
  generate(metrics: AiMetrics): BusinessHealthObject {
    const contributors = [
      {
        name: "Sales",
        status: metrics.revenueToday > 0 || metrics.revenueLast7Days > 0 ? "GOOD" : "NEEDS_DATA",
        summary: metrics.revenueToday > 0 ? "Revenue is visible today." : "Recent synchronized revenue is limited.",
      },
      {
        name: "Channel coverage",
        status: metrics.connectedPlatforms.length > 1 ? "GOOD" : "AT_RISK",
        summary:
          metrics.connectedPlatforms.length > 1
            ? "Multiple connected platforms support comparison."
            : "Current intelligence depends on one connected platform.",
      },
      {
        name: "Inventory",
        status: metrics.outOfStockProducts > 0 || metrics.lowStockProducts > 0 ? "AT_RISK" : "GOOD",
        summary:
          metrics.outOfStockProducts > 0 || metrics.lowStockProducts > 0
            ? "Inventory risk is present in synchronized product data."
            : "No low-stock or out-of-stock products are visible.",
      },
      {
        name: "Refund activity",
        status: metrics.refundsToday > 0 ? "AT_RISK" : "GOOD",
        summary: metrics.refundsToday > 0 ? "Refund activity is present today." : "Refund activity is low today.",
      },
    ] as const;

    const score = Math.max(
      0,
      Math.min(
        100,
        100 -
          contributors.filter((contributor) => contributor.status === "AT_RISK").length * 12 -
          contributors.filter((contributor) => contributor.status === "NEEDS_DATA").length * 18,
      ),
    );

    return {
      id: "business-health-today",
      type: "BUSINESS_HEALTH",
      title: "Business Health Score",
      summary: `Business health is ${score >= 75 ? "good" : "at risk"} based on synchronized commerce data.`,
      severity: score >= 75 ? "INFO" : "MEDIUM",
      score,
      status: score >= 75 ? "GOOD" : "AT_RISK",
      contributors,
      evidence: [
        { metric: "revenueLast7Days", value: metrics.revenueLast7Days, source: "normalized_orders" },
        { metric: "connectedPlatforms", value: metrics.connectedPlatforms.length, source: "connected_stores" },
        { metric: "lowStockProducts", value: metrics.lowStockProducts, source: "normalized_products" },
        { metric: "refundsToday", value: metrics.refundsToday, source: "normalized_refunds" },
      ],
    };
  }
}
