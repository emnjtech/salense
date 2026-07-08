import { NarrativeGeneratorService } from "../narrative-generator.service.js";
import type { AIService } from "../ai.service.js";
import type { AiContextObject } from "../types/ai-context.type.js";

describe("NarrativeGeneratorService", () => {
  it("returns provider narrative when generation succeeds", async () => {
    const aiService = {
      generateNarrative: jest.fn().mockResolvedValue({
        narrative: "Good afternoon. Revenue increased today.",
        provider: "openai",
        model: "gpt-test",
        promptVersion: "prompt-v1",
        fallbackUsed: false,
      }),
    } as unknown as AIService;
    const service = new NarrativeGeneratorService(aiService);

    await expect(service.generateDailyBriefing(minimalContext(), "fallback")).resolves.toMatchObject({
      fallbackUsed: false,
      narrative: "Good afternoon. Revenue increased today.",
      provider: "openai",
    });
  });

  it("falls back to deterministic narrative when provider fails", async () => {
    const aiService = {
      generateNarrative: jest.fn().mockRejectedValue(new Error("provider unavailable")),
    } as unknown as AIService;
    const service = new NarrativeGeneratorService(aiService);

    await expect(service.generateDailyBriefing(minimalContext(), "deterministic summary")).resolves.toEqual({
      narrative: "deterministic summary",
      provider: "deterministic",
      model: "business-reasoning",
      promptVersion: "prompt-v1",
      fallbackUsed: true,
    });
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
    observations: [],
    diagnostics: { risks: [], opportunities: [] },
    recommendations: [],
    forecasts: [],
    confidence: { level: "MEDIUM", score: 70, summary: "Medium confidence", factors: [] },
    explainability: {
      dataSources: [],
      rulesApplied: [],
      limitations: [],
      safetyConstraints: [],
    },
  };
}
