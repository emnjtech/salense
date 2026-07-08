import { Injectable } from "@nestjs/common";
import type { AiMetrics, AiSourceData } from "../types/ai-source-data.type.js";

@Injectable()
export class ExecutiveSummaryEngine {
  generate(data: AiSourceData, metrics: AiMetrics): string {
    const platformPhrase =
      metrics.topPlatformByRevenue === null
        ? "No strongest platform is available yet"
        : `${formatPlatform(metrics.topPlatformByRevenue.platform)} is currently the strongest channel`;

    return `${data.business.name} has ${metrics.ordersToday} orders and ${formatCurrency(metrics.revenueToday)} revenue today across ${metrics.connectedPlatforms.length} connected platform${metrics.connectedPlatforms.length === 1 ? "" : "s"}. ${platformPhrase}. Inventory attention is required for ${metrics.lowStockProducts + metrics.outOfStockProducts} products.`;
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
