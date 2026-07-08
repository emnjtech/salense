import { OpenAIProvider } from "../providers/openai-provider.js";
import type { PromptTemplate } from "../types/ai-context.type.js";

describe("OpenAIProvider", () => {
  it("is unavailable without an API key", () => {
    const provider = new OpenAIProvider({ OPENAI_MODEL: "gpt-test" } as NodeJS.ProcessEnv);

    expect(provider.isAvailable()).toBe(false);
  });

  it("sends prompt messages to OpenAI with deterministic temperature", async () => {
    const fetchImpl = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>().mockResolvedValue({
      json: async () => ({ choices: [{ message: { content: "Good afternoon. Revenue improved." } }] }),
      ok: true,
      status: 200,
    } as Response);
    const provider = new OpenAIProvider(
      {
        OPENAI_API_KEY: "test-key",
        OPENAI_MODEL: "gpt-test",
        TEMPERATURE: "0.2",
      } as NodeJS.ProcessEnv,
      fetchImpl,
    );

    const result = await provider.generateText({ prompt: promptTemplate() });

    expect(result).toEqual({
      text: "Good afternoon. Revenue improved.",
      provider: "openai",
      model: "gpt-test",
    });
    const [, init] = fetchImpl.mock.calls[0] ?? [];
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-key");
    expect(init?.body).toContain('"temperature":0.2');
    expect(init?.body).not.toContain("secret");
  });
});

function promptTemplate(): PromptTemplate {
  return {
    promptVersion: "prompt-v1",
    type: "DAILY_BRIEFING",
    messages: [
      { role: "system", content: "communicate only" },
      { role: "user", content: "context only" },
    ],
  };
}
