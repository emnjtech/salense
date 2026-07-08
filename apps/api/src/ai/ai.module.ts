import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { AiBriefingService } from "./ai-briefing.service.js";
import { AiController } from "./ai.controller.js";
import { AIService } from "./ai.service.js";
import { ContextBuilderService } from "./context-builder.service.js";
import { BusinessHealthEngine } from "./engines/business-health.engine.js";
import { ConfidenceEngine } from "./engines/confidence.engine.js";
import { DiagnosticEngine } from "./engines/diagnostic.engine.js";
import { ExecutiveSummaryEngine } from "./engines/executive-summary.engine.js";
import { ExplainabilityEngine } from "./engines/explainability.engine.js";
import { ForecastingEngine } from "./engines/forecasting.engine.js";
import { ObservationEngine } from "./engines/observation.engine.js";
import { RecommendationEngine } from "./engines/recommendation.engine.js";
import { NarrativeGeneratorService } from "./narrative-generator.service.js";
import { OpenAIProvider } from "./providers/openai-provider.js";
import { ProviderFactoryService } from "./providers/provider-factory.service.js";
import { PromptOrchestratorService } from "./prompt-orchestrator.service.js";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [AiController],
  providers: [
    AiBriefingService,
    ObservationEngine,
    DiagnosticEngine,
    RecommendationEngine,
    ForecastingEngine,
    BusinessHealthEngine,
    ConfidenceEngine,
    ExplainabilityEngine,
    ExecutiveSummaryEngine,
    ContextBuilderService,
    PromptOrchestratorService,
    OpenAIProvider,
    ProviderFactoryService,
    AIService,
    NarrativeGeneratorService,
  ],
  exports: [AiBriefingService],
})
export class AiModule {}
