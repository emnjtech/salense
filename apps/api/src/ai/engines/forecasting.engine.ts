import { Injectable } from "@nestjs/common";
import { percentageChange } from "./metrics.js";
import type { ForecastObject } from "../types/ai-objects.type.js";
import type { AiMetrics } from "../types/ai-source-data.type.js";

@Injectable()
export class ForecastingEngine {
  generate(metrics: AiMetrics): readonly ForecastObject[] {
    const revenueChange = percentageChange(metrics.revenueToday, metrics.revenueYesterday);
    const direction = revenueChange === null ? "UNKNOWN" : revenueChange > 10 ? "UP" : revenueChange < -10 ? "DOWN" : "FLAT";

    return [
      {
        id: "forecast-near-term-sales-direction",
        type: "FORECAST",
        horizon: "NEXT_7_DAYS",
        direction,
        title: "Near-term sales direction",
        summary:
          direction === "UNKNOWN"
            ? "More synchronized order history is required before Salense can assess near-term sales direction reliably."
            : `Recent revenue movement suggests near-term sales direction is ${direction.toLowerCase()}.`,
        severity: direction === "DOWN" ? "MEDIUM" : "INFO",
        evidence: [
          { metric: "revenueToday", value: metrics.revenueToday, source: "normalized_orders" },
          { metric: "revenueYesterday", value: metrics.revenueYesterday, source: "normalized_orders" },
          { metric: "revenueLast7Days", value: metrics.revenueLast7Days, source: "normalized_orders" },
        ],
      },
    ];
  }
}
