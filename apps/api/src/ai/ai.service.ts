import { Inject, Injectable } from "@nestjs/common";
import { PromptOrchestratorService } from "./prompt-orchestrator.service.js";
import { ProviderFactoryService } from "./providers/provider-factory.service.js";
import type {
  AiContextObject,
  NarrativeGenerationResult,
  PromptType,
} from "./types/ai-context.type.js";

@Injectable()
export class AIService {
  constructor(
    @Inject(ProviderFactoryService) private readonly providerFactory: ProviderFactoryService,
    @Inject(PromptOrchestratorService)
    private readonly promptOrchestrator: PromptOrchestratorService,
  ) {}

  async generateNarrative(
    context: AiContextObject,
    promptType: PromptType,
  ): Promise<NarrativeGenerationResult> {
    const provider = this.providerFactory.getProvider();
    const prompt = this.promptOrchestrator.createPrompt(promptType, context);

    if (!provider.isAvailable()) {
      throw new Error("AI provider is not configured.");
    }

    const result = await provider.generateText({ prompt });

    return {
      narrative: result.text,
      provider: result.provider,
      model: result.model,
      promptVersion: prompt.promptVersion,
      fallbackUsed: false,
    };
  }
}
