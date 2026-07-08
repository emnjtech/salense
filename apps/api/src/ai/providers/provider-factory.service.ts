import { Inject, Injectable } from "@nestjs/common";
import { OpenAIProvider } from "./openai-provider.js";
import type { IAIProvider } from "./ai-provider.interface.js";

@Injectable()
export class ProviderFactoryService {
  constructor(@Inject(OpenAIProvider) private readonly openAIProvider: OpenAIProvider) {}

  getProvider(): IAIProvider {
    return this.openAIProvider;
  }
}
