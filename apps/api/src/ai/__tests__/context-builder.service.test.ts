import { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";
import { ContextBuilderService } from "../context-builder.service.js";

describe("ContextBuilderService", () => {
  it("builds a sanitized context object from deterministic reasoning objects", () => {
    const context = new ContextBuilderService().build({
      generatedAt: "2026-07-08T10:00:00.000Z",
      businessOverview: {
        businessId: "business_1",
        businessName: "Ivonmelda Hair",
        connectedStores: 1,
        connectedPlatforms: [StorePlatform.WooCommerce],
        synchronizedStores: 1,
        revenueToday: 303,
        revenueYesterday: 150,
        ordersToday: 1,
        refundsToday: 0,
        productsTracked: 12,
        customersTracked: 9,
        lowStockProducts: 2,
        outOfStockProducts: 0,
      },
      businessHealth: {
        id: "health",
        type: "BUSINESS_HEALTH",
        title: "Business Health",
        summary: "Healthy",
        severity: "INFO",
        evidence: [],
        score: 82,
        status: "GOOD",
        contributors: [],
      },
      observations: [],
      risks: [],
      opportunities: [],
      recommendations: [],
      forecasts: [],
      confidence: { level: "MEDIUM", score: 70, summary: "Medium confidence", factors: [] },
      explainability: {
        dataSources: ["Normalized orders"],
        rulesApplied: ["Revenue statuses are filtered."],
        limitations: ["Limited history."],
        safetyConstraints: ["No raw payloads are exposed."],
      },
    });

    expect(context).toMatchObject({
      contextVersion: "ai-context-v1",
      businessOverview: {
        businessName: "Ivonmelda Hair",
        revenueToday: 303,
      },
    });
    expect(JSON.stringify(context)).not.toContain("business_1");
    expect(JSON.stringify(context)).not.toContain("sourceMetadata");
    expect(JSON.stringify(context)).not.toContain("accessToken");
    expect(JSON.stringify(context)).not.toContain("passwordHash");
  });
});
