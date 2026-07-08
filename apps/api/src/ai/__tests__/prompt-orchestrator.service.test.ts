import { PromptOrchestratorService } from "../prompt-orchestrator.service.js";
import type { AiContextObject } from "../types/ai-context.type.js";

describe("PromptOrchestratorService", () => {
  it("creates communication-only daily briefing prompts from context objects", () => {
    const context = minimalContext();
    const prompt = new PromptOrchestratorService().createPrompt("DAILY_BRIEFING", context);

    expect(prompt).toMatchObject({
      promptVersion: "prompt-v1",
      type: "DAILY_BRIEFING",
    });
    expect(prompt.messages[0]?.content).toContain("You do not calculate analytics");
    expect(prompt.messages[1]?.content).toContain("Use only this context object");
    expect(prompt.messages[1]?.content).toContain("Revenue today");
    expect(prompt.messages[1]?.content).not.toContain("sourceMetadata");
    expect(prompt.messages[1]?.content).not.toContain("accessToken");
  });
});

function minimalContext(): AiContextObject {
  return {
    contextVersion: "ai-context-v1",
    generatedAt: "2026-07-08T10:00:00.000Z",
    businessOverview: {
      businessName: "Ivonmelda Hair",
      connectedStores: 1,
      connectedPlatforms: [],
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
    observations: [
      {
        id: "observation",
        type: "OBSERVATION",
        title: "Revenue today",
        summary: "Revenue is £303 today.",
        severity: "INFO",
        evidence: [],
        category: "REVENUE",
        direction: "UP",
      },
    ],
    diagnostics: { risks: [], opportunities: [] },
    recommendations: [],
    forecasts: [],
    confidence: { level: "MEDIUM", score: 70, summary: "Medium confidence", factors: [] },
    explainability: {
      dataSources: ["Normalized orders"],
      rulesApplied: ["Revenue statuses are filtered."],
      limitations: [],
      safetyConstraints: ["No raw payloads are exposed."],
    },
  };
}
