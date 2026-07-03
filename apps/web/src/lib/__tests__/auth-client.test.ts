import { createAuthApiClient } from "../api/auth-client";
import {
  clearDemoSession,
  readDemoSession,
  saveDemoSession,
  type SessionStoragePort,
} from "../auth-session";

describe("auth API client", () => {
  it("normalizes login email before sending credentials", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(
        jsonResponse({
          accessToken: "access",
          accessTokenExpiresIn: "15m",
          refreshToken: "refresh",
          refreshTokenExpiresIn: "7d",
          user: { email: "owner@example.com", emailVerified: true, id: "user_1" },
        }),
      );
    const client = createAuthApiClient({ baseUrl: "https://api.salense.test", fetchImpl });

    await client.login({ email: " Owner@Example.COM ", password: "Password123!" });

    const [, init] = fetchImpl.mock.calls[0] ?? [];
    expect(init?.body).toBe(
      JSON.stringify({ email: "owner@example.com", password: "Password123!" }),
    );
  });

  it("stores and clears the demo browser session", () => {
    const storage = createMemoryStorage();

    saveDemoSession(
      {
        accessToken: "access-token",
        accessTokenExpiresIn: "15m",
        refreshToken: "refresh-token",
        refreshTokenExpiresIn: "7d",
        user: { email: "owner@example.com", emailVerified: true, id: "user_1" },
      },
      storage,
    );

    expect(readDemoSession(storage)).toEqual({
      accessToken: "access-token",
      accessTokenExpiresIn: "15m",
      refreshToken: "refresh-token",
      refreshTokenExpiresIn: "7d",
      userEmail: "owner@example.com",
      userId: "user_1",
    });

    clearDemoSession(storage);

    expect(readDemoSession(storage)).toBeNull();
  });
});

function jsonResponse(body: unknown): Response {
  return {
    json: async () => body,
    ok: true,
    status: 200,
  } as Response;
}

function createMemoryStorage(): SessionStoragePort {
  const values = new Map<string, string>();

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}
