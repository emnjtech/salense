import { Injectable } from "@nestjs/common";
import type { DiagnosticObject } from "../types/ai-objects.type.js";
import type { AiMetrics } from "../types/ai-source-data.type.js";

@Injectable()
export class DiagnosticEngine {
  generateRisks(metrics: AiMetrics): readonly DiagnosticObject[] {
    const risks: DiagnosticObject[] = [];

    if (metrics.lowStockProducts > 0 || metrics.outOfStockProducts > 0) {
      risks.push({
        id: "risk-inventory-availability",
        type: "DIAGNOSTIC",
        driver: "INVENTORY",
        title: "Inventory availability risk",
        summary: "Inventory risk is present and may affect near-term sales if best-selling products cannot be fulfilled.",
        severity: metrics.outOfStockProducts > 0 ? "HIGH" : "MEDIUM",
        evidence: [
          { metric: "lowStockProducts", value: metrics.lowStockProducts, source: "normalized_products" },
          { metric: "outOfStockProducts", value: metrics.outOfStockProducts, source: "normalized_products" },
        ],
      });
    }

    if (metrics.connectedPlatforms.length === 1) {
      risks.push({
        id: "risk-platform-concentration",
        type: "DIAGNOSTIC",
        driver: "PLATFORM_CONCENTRATION",
        title: "Single-channel dependency",
        summary: "Current synchronized performance comes from one platform, so platform-level disruption would affect the whole visible business picture.",
        severity: "MEDIUM",
        evidence: [
          { metric: "connectedPlatforms", value: metrics.connectedPlatforms.length, source: "connected_stores" },
        ],
      });
    }

    if (metrics.refundsToday > 0) {
      risks.push({
        id: "risk-refund-activity",
        type: "DIAGNOSTIC",
        driver: "REFUNDS",
        title: "Refund activity",
        summary: "Refund activity is present today and should be reviewed for product, fulfilment, or customer-experience patterns.",
        severity: "LOW",
        evidence: [{ metric: "refundsToday", value: metrics.refundsToday, source: "normalized_refunds" }],
      });
    }

    return risks;
  }

  generateOpportunities(metrics: AiMetrics): readonly DiagnosticObject[] {
    const opportunities: DiagnosticObject[] = [];

    if (metrics.topProduct) {
      opportunities.push({
        id: "opportunity-top-product",
        type: "DIAGNOSTIC",
        driver: "SALES_MOMENTUM",
        title: "Product momentum",
        summary: `${metrics.topProduct.name} is the strongest visible product by revenue in the synchronized data.`,
        severity: "INFO",
        evidence: [
          { metric: "topProductRevenue", value: metrics.topProduct.revenue, source: "normalized_orders" },
          { metric: "topProductUnitsSold", value: metrics.topProduct.unitsSold, source: "normalized_orders" },
        ],
      });
    }

    if (metrics.connectedPlatforms.length > 1 && metrics.topPlatformByRevenue) {
      opportunities.push({
        id: "opportunity-platform-comparison",
        type: "DIAGNOSTIC",
        driver: "DATA_COVERAGE",
        title: "Platform comparison available",
        summary: "Multiple synchronized platforms are available, enabling channel-level performance comparison.",
        severity: "INFO",
        evidence: [
          { metric: "connectedPlatforms", value: metrics.connectedPlatforms.length, source: "connected_stores" },
        ],
      });
    }

    return opportunities;
  }
}
