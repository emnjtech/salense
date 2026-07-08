import { Injectable } from "@nestjs/common";
import type { AiContextObject, PromptTemplate, PromptType } from "./types/ai-context.type.js";

@Injectable()
export class PromptOrchestratorService {
  createPrompt(type: PromptType, context: AiContextObject): PromptTemplate {
    return {
      promptVersion: "prompt-v1",
      type,
      messages: [
        {
          role: "system",
          content:
            "You are Salense's communication layer. You do not calculate analytics, discover facts, infer unsupported details, or recommend actions beyond the supplied context. Explain verified deterministic business reasoning in concise executive language. No hype. No emojis.",
        },
        {
          role: "user",
          content: `${this.getTaskInstruction(type)}\n\nUse only this context object:\n${JSON.stringify(context)}`,
        },
      ],
    };
  }

  private getTaskInstruction(type: PromptType): string {
    switch (type) {
      case "DAILY_BRIEFING":
        return "Write a short daily business briefing for the Today dashboard. Mention only verified observations, risks, recommendations, confidence, and business health from the context.";
      case "EXECUTIVE_SUMMARY":
        return "Write a concise executive summary. Organise the supplied findings into clear business language without adding new facts.";
      case "RECOMMENDATION_EXPLANATION":
        return "Explain the recommendation basis using the supplied evidence, confidence, and explainability references only.";
      case "BUSINESS_QUERY":
        return "Answer the business query using only the supplied context. If the context does not contain the answer, state that the available synchronized data is insufficient.";
    }
  }
}
