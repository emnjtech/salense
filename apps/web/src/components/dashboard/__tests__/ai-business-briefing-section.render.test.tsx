import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { AiBriefingTodayResponse } from "../../../lib/api/ai-client";
import { StorePlatform } from "../../../lib/api/store-integrations-client";
import { AiBusinessBriefingSection } from "../today-dashboard";

describe("AiBusinessBriefingSection", () => {
  it("renders the insufficient data state without fake output", () => {
    const html = renderToStaticMarkup(
      createElement(AiBusinessBriefingSection, {
        briefing: {
          status: "INSUFFICIENT_DATA",
          generatedAt: "2026-07-08T10:00:00.000Z",
          message: "Not enough synchronized commerce data is available to generate a reliable AI briefing.",
          observations: [],
          risks: [],
          opportunities: [],
          recommendations: [],
          forecasts: [],
        } satisfies AiBriefingTodayResponse,
      }),
    );

    expect(html).toContain(
      "Salense Intelligence will become available after your first successful store synchronization.",
    );
    expect(html).not.toContain("Revenue today</span><strong>");
    expect(html).not.toContain("Recommended next actions");
  });

  it("renders observations, recommendations, and explainability details", () => {
    const html = renderToStaticMarkup(
      createElement(AiBusinessBriefingSection, {
        briefing: readyBriefing(),
      }),
    );

    expect(html).toContain("Salense Intelligence");
    expect(html).toContain("AI Business Briefing");
    expect(html).toContain("Ivonmelda Hair has 1 order today.");
    expect(html).toContain("Revenue today");
    expect(html).toContain("Inventory availability risk");
    expect(html).toContain("Review inventory availability");
    expect(html).toContain("View evidence");
    expect(html).toContain("Why this briefing?");
    expect(html).toContain("Only revenue-eligible order statuses contribute to revenue.");
    expect(html).toContain("No marketplace APIs are queried by the AI layer.");
  });

  it("does not render raw payloads, tokens, hashes, or secrets", () => {
    const html = renderToStaticMarkup(
      createElement(AiBusinessBriefingSection, {
        briefing: readyBriefing(),
      }),
    );

    expect(html).not.toContain("sourceMetadata");
    expect(html).not.toContain("rawPayload");
    expect(html).not.toContain("accessToken");
    expect(html).not.toContain("refreshToken");
    expect(html).not.toContain("passwordHash");
    expect(html).not.toContain("secret");
  });
});

function readyBriefing(): AiBriefingTodayResponse {
  return {
    status: "READY",
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
    executiveSummary: "Ivonmelda Hair has 1 order today.",
    observations: [
      {
        id: "observation-revenue-today",
        type: "OBSERVATION",
        title: "Revenue today",
        summary: "Revenue is £303 today.",
        severity: "INFO",
        category: "REVENUE",
        direction: "UP",
        evidence: [{ metric: "revenueToday", value: 303, source: "normalized_orders" }],
      },
    ],
    risks: [
      {
        id: "risk-inventory-availability",
        type: "DIAGNOSTIC",
        title: "Inventory availability risk",
        summary: "Inventory risk is present.",
        severity: "MEDIUM",
        driver: "INVENTORY",
        evidence: [{ metric: "lowStockProducts", value: 2, source: "normalized_products" }],
      },
    ],
    opportunities: [],
    recommendations: [
      {
        id: "recommendation-review-inventory",
        type: "RECOMMENDATION",
        title: "Review inventory availability",
        summary: "Review low-stock products before running new promotions.",
        severity: "MEDIUM",
        priority: "HIGH",
        actionType: "REVIEW_INVENTORY",
        evidence: [{ metric: "lowStockProducts", value: 2, source: "normalized_products" }],
      },
    ],
    forecasts: [],
    businessHealth: {
      id: "business-health-today",
      type: "BUSINESS_HEALTH",
      title: "Business Health Score",
      summary: "Business health is good.",
      severity: "INFO",
      score: 82,
      status: "GOOD",
      contributors: [],
      evidence: [{ metric: "revenueLast7Days", value: 1200, source: "normalized_orders" }],
    },
    confidence: {
      level: "MEDIUM",
      score: 70,
      summary: "Confidence is medium.",
      factors: ["At least one connected store has synchronized successfully."],
    },
    explainability: {
      dataSources: ["Normalized commerce orders"],
      rulesApplied: ["Only revenue-eligible order statuses contribute to revenue."],
      limitations: ["The briefing reflects synchronized data available inside Salense only."],
      safetyConstraints: ["No marketplace APIs are queried by the AI layer."],
    },
  };
}
