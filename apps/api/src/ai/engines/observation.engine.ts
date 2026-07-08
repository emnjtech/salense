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
      title: "Revenue today",
      summary:
        revenueChange === null
          ? `Revenue is ${formatCurrency(metrics.revenueToday)} today.`
          : `Revenue is ${formatCurrency(metrics.revenueToday)} today, ${Math.abs(revenueChange)}% ${revenueChange >= 0 ? "above" : "below"} yesterday.`,
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
      title: "Orders today",
      summary: `${metrics.ordersToday} orders have been captured today across synchronized stores.`,
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
        title: "Strongest platform",
        summary: `${formatPlatform(metrics.topPlatformByRevenue.platform)} is currently the strongest revenue channel.`,
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

function formatCurrency(value: number): string {
  return `£${Math.round(value).toLocaleString("en-GB")}`;
}

function formatPlatform(platform: string): string {
  return platform
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
