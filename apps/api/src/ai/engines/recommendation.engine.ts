import { Injectable } from "@nestjs/common";
import type { DiagnosticObject, RecommendationObject } from "../types/ai-objects.type.js";

@Injectable()
export class RecommendationEngine {
  generate(risks: readonly DiagnosticObject[]): readonly RecommendationObject[] {
    return risks.map((risk) => {
      if (risk.driver === "INVENTORY") {
        return {
          id: "recommendation-review-inventory",
          type: "RECOMMENDATION",
          actionType: "REVIEW_INVENTORY",
          priority: risk.severity === "HIGH" ? "HIGH" : "MEDIUM",
          title: "Review inventory availability",
          summary: "Review low-stock and out-of-stock products before running new promotions or accepting additional demand.",
          severity: risk.severity,
          evidence: risk.evidence,
        };
      }

      if (risk.driver === "PLATFORM_CONCENTRATION") {
        return {
          id: "recommendation-connect-more-channels",
          type: "RECOMMENDATION",
          actionType: "CONNECT_MORE_CHANNELS",
          priority: "MEDIUM",
          title: "Increase channel visibility",
          summary: "Connect additional active sales channels so Salense can compare performance across the full business.",
          severity: "MEDIUM",
          evidence: risk.evidence,
        };
      }

      return {
        id: `recommendation-${risk.id}`,
        type: "RECOMMENDATION",
        actionType: "MONITOR_TREND",
        priority: "LOW",
        title: "Monitor the highlighted trend",
        summary: "Keep reviewing this signal as more synchronized data becomes available.",
        severity: risk.severity,
        evidence: risk.evidence,
      };
    });
  }
}
