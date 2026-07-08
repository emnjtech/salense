import { createAiApiClient } from "../api/ai-client";

describe("AI API client", () => {
  it("loads today's AI briefing with bearer authentication", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ status: "INSUFFICIENT_DATA", observations: [] }));
    const client = createAiApiClient({ baseUrl: "https://api.salense.test/", fetchImpl });

    const response = await client.getTodayBriefing("access-token");

    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://api.salense.test/ai/briefing/today");
    expect(getAuthorization(fetchImpl.mock.calls[0]?.[1])).toBe("Bearer access-token");
    expect(response.status).toBe("INSUFFICIENT_DATA");
  });

  it("maps AI API errors safely", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ message: "Unable to load briefing" }, false, 503));
    const client = createAiApiClient({ baseUrl: "https://api.salense.test", fetchImpl });

    await expect(client.getTodayBriefing("access-token")).rejects.toThrow(
      "Unable to load briefing",
    );
  });
});

function getAuthorization(init: RequestInit | undefined): string | null {
  return new Headers(init?.headers).get("authorization");
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    json: async () => body,
    ok,
    status,
  } as Response;
}
