import type { PromptTemplate } from "../types/ai-context.type.js";

export interface GenerateTextInput {
  readonly prompt: PromptTemplate;
  readonly timeoutMs?: number;
}

export interface GenerateTextResult {
  readonly text: string;
  readonly provider: string;
  readonly model: string;
}

export interface IAIProvider {
  readonly name: string;
  readonly model: string;
  isAvailable(): boolean;
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
}
