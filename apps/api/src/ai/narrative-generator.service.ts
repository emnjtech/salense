import { Inject, Injectable } from "@nestjs/common";
import { AIService } from "./ai.service.js";
import type { AiContextObject, NarrativeGenerationResult } from "./types/ai-context.type.js";

@Injectable()
export class NarrativeGeneratorService {
  constructor(@Inject(AIService) private readonly aiService: AIService) {}

  async generateDailyBriefing(
    context: AiContextObject,
    fallbackNarrative: string,
  ): Promise<NarrativeGenerationResult> {
    try {
      return await this.aiService.generateNarrative(context, "DAILY_BRIEFING");
    } catch {
      return {
        narrative: fallbackNarrative,
        provider: "deterministic",
        model: "business-reasoning",
        promptVersion: "prompt-v1",
        fallbackUsed: true,
      };
    }
  }
}
