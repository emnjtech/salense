import { Injectable } from "@nestjs/common";
import type { ExplainabilityObject } from "../types/ai-objects.type.js";

@Injectable()
export class ExplainabilityEngine {
  generate(): ExplainabilityObject {
    return {
      dataSources: [
        "Connected store records",
        "Normalized commerce orders",
        "Normalized commerce order items",
        "Normalized commerce products",
        "Normalized commerce customers",
        "Normalized commerce refunds",
      ],
      rulesApplied: [
        "Only revenue-eligible order statuses contribute to revenue.",
        "Disconnected stores are excluded from the briefing.",
        "Platform identity remains separate; products are not matched across platforms.",
        "Inventory risk is derived from stock status and stock quantity.",
        "Confidence increases with synchronized stores, order volume, product data, and customer data.",
      ],
      limitations: [
        "The briefing reflects synchronized data available inside Salense only.",
        "Missing platform fields may reduce confidence.",
        "Forecasting is directional and deterministic in Sprint 1.",
      ],
      safetyConstraints: [
        "No marketplace APIs are queried by the AI layer.",
        "No raw marketplace payloads are exposed.",
        "No credentials, tokens, hashes, or encrypted secrets are selected.",
        "No autonomous commercial actions are performed.",
      ],
    };
  }
}
