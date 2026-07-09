import { Injectable } from "@nestjs/common";
import { percentageChange } from "./metrics.js";
import type { AiMetrics } from "../types/ai-source-data.type.js";
import type { ObservationObject } from "../types/ai-objects.type.js";

@Injectable()
export class ObservationEngine {
  generate(metrics: AiMetrics): readonly ObservationObject[] {
    const observations: ObservationObject[] = [];
    const revenueChange = percentageChange(metrics.revenueToday, metrics.revenueYesterday);

    observations.push({
      id: "observation-revenue-today",
      type: "OBSERVATION",
      category: "REVENUE",
      title: metrics.revenueToday > 0 ? "Revenue pace needs context" : "Revenue has not started yet",
      summary:
        revenueChange === null
          ? metrics.revenueToday > 0
            ? "Revenue is visible today, but more prior-period data is needed before Salense can judge whether the pace is unusual."
            : "Revenue has not yet started today. Salense should monitor whether this is normal trading timing or an early demand signal."
          : revenueChange >= 0
            ? `Revenue is pacing ${Math.abs(revenueChange)}% above yesterday, which may reflect stronger demand, timing, or recent commercial activity.`
            : `Revenue is pacing ${Math.abs(revenueChange)}% below yesterday, which may indicate lower traffic, product availability issues, or normal timing variance.`,
      severity: metrics.revenueToday > 0 ? "INFO" : "MEDIUM",
      direction: revenueChange === null ? "UNKNOWN" : revenueChange > 0 ? "UP" : revenueChange < 0 ? "DOWN" : "FLAT",
      evidence: [
        { metric: "revenueToday", value: metrics.revenueToday, source: "normalized_orders" },
        { metric: "revenueYesterday", value: metrics.revenueYesterday, source: "normalized_orders" },
      ],
    });

    observations.push({
      id: "observation-orders-today",
      type: "OBSERVATION",
      category: "ORDERS",
      title:
        metrics.ordersToday >= metrics.ordersYesterday
          ? "Order pace is holding"
          : "Order pace needs attention",
      summary:
        metrics.ordersToday >= metrics.ordersYesterday
          ? "Order activity is at or above yesterday's level, suggesting demand is currently stable."
          : "Order pace is below yesterday's level at this point, which may reflect reduced traffic, fewer promotions, product availability, or normal daily timing variance.",
      severity: "INFO",
      direction:
        metrics.ordersToday > metrics.ordersYesterday
          ? "UP"
          : metrics.ordersToday < metrics.ordersYesterday
            ? "DOWN"
            : "FLAT",
      evidence: [
        { metric: "ordersToday", value: metrics.ordersToday, source: "normalized_orders" },
        { metric: "ordersYesterday", value: metrics.ordersYesterday, source: "normalized_orders" },
      ],
    });

    if (metrics.topPlatformByRevenue) {
      observations.push({
        id: "observation-top-platform",
        type: "OBSERVATION",
        category: "PLATFORM",
        title:
          metrics.connectedPlatforms.length > 1
            ? "Channel performance is differentiating"
            : "Revenue concentration limits comparison",
        summary:
          metrics.connectedPlatforms.length > 1
            ? `${formatPlatform(metrics.topPlatformByRevenue.platform)} is leading current performance, which helps identify where demand is strongest.`
            : `Current performance depends on ${formatPlatform(metrics.topPlatformByRevenue.platform)}, limiting cross-channel comparison and increasing concentration risk.`,
        severity: "INFO",
        direction: "UNKNOWN",
        evidence: [
          {
            metric: "topPlatformRevenue",
            value: metrics.topPlatformByRevenue.revenue,
            source: "normalized_orders",
          },
        ],
      });
    }

    if (metrics.lowStockProducts > 0 || metrics.outOfStockProducts > 0) {
      observations.push({
        id: "observation-inventory-attention",
        type: "OBSERVATION",
        category: "INVENTORY",
        title: "Inventory attention",
        summary: `${metrics.lowStockProducts} products are low in stock and ${metrics.outOfStockProducts} products are out of stock.`,
        severity: metrics.outOfStockProducts > 0 ? "HIGH" : "MEDIUM",
        direction: "UNKNOWN",
        evidence: [
          { metric: "lowStockProducts", value: metrics.lowStockProducts, source: "normalized_products" },
          { metric: "outOfStockProducts", value: metrics.outOfStockProducts, source: "normalized_products" },
        ],
      });
    }

    return observations;
  }
}

export function formatCurrency(value: number): string {
  return `£${Math.round(value).toLocaleString("en-GB")}`;
}

function formatPlatform(platform: string): string {
  return platform
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
