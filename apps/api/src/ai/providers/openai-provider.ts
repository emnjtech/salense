import { Injectable } from "@nestjs/common";
import type {
  GenerateTextInput,
  GenerateTextResult,
  IAIProvider,
} from "./ai-provider.interface.js";

interface OpenAIChatCompletionResponse {
  readonly choices?: readonly {
    readonly message?: {
      readonly content?: string | null;
    };
  }[];
}

type FetchLike = typeof fetch;

@Injectable()
export class OpenAIProvider implements IAIProvider {
  readonly name = "openai";
  readonly model: string;
  private readonly apiKey: string | undefined;
  private readonly temperature: number;

  constructor(
    environment: NodeJS.ProcessEnv = process.env,
    private readonly fetchImpl: FetchLike = fetch,
  ) {
    this.apiKey = environment.OPENAI_API_KEY?.trim() || undefined;
    this.model = environment.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    this.temperature = parseTemperature(environment.TEMPERATURE);
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    if (!this.apiKey) {
      throw new Error("OpenAI provider is not configured.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 10000);

    try {
      const response = await this.fetchImpl("https://api.openai.com/v1/chat/completions", {
        body: JSON.stringify({
          model: this.model,
          temperature: this.temperature,
          messages: input.prompt.messages,
        }),
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        method: "POST",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("OpenAI narrative generation failed.");
      }

      const body = (await response.json()) as OpenAIChatCompletionResponse;
      const text = body.choices?.[0]?.message?.content?.trim();

      if (!text) {
        throw new Error("OpenAI narrative generation returned an empty response.");
      }

      return {
        text,
        provider: this.name,
        model: this.model,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function parseTemperature(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0.2;
}
