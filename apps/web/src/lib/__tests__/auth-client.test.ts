import { createAuthApiClient } from "../api/auth-client";
import {
  clearDemoSession,
  fetchWithSessionRefresh,
  readDemoSession,
  saveDemoSession,
  SessionExpiredError,
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

  it("refreshes an expired access token and retries the original request once", async () => {
    const storage = createMemoryStorage();
    saveDemoSession(
      {
        accessToken: "expired-access",
        accessTokenExpiresIn: "15m",
        refreshToken: "refresh-token",
        refreshTokenExpiresIn: "7d",
        user: { email: "owner@example.com", emailVerified: true, id: "user_1" },
      },
      storage,
    );
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValueOnce(jsonResponse({ message: "JWT access token has expired." }, false, 401))
      .mockResolvedValueOnce(
        jsonResponse({
          accessToken: "fresh-access",
          accessTokenExpiresIn: "15m",
          user: { email: "owner@example.com", emailVerified: true, id: "user_1" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const response = await fetchWithSessionRefresh(
      "https://api.salense.test/dashboard/today",
      {},
      {
        accessToken: "expired-access",
        baseUrl: "https://api.salense.test",
        fetchImpl,
        storage,
      },
    );

    expect(await response.json()).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(getAuthorization(fetchImpl.mock.calls[0]?.[1])).toBe("Bearer expired-access");
    expect(fetchImpl.mock.calls[1]?.[0]).toBe("https://api.salense.test/auth/refresh");
    expect(getAuthorization(fetchImpl.mock.calls[2]?.[1])).toBe("Bearer fresh-access");
    expect(readDemoSession(storage)?.accessToken).toBe("fresh-access");
  });

  it("clears the browser session when refresh fails", async () => {
    const storage = createMemoryStorage();
    saveDemoSession(
      {
        accessToken: "expired-access",
        accessTokenExpiresIn: "15m",
        refreshToken: "refresh-token",
        refreshTokenExpiresIn: "7d",
        user: { email: "owner@example.com", emailVerified: true, id: "user_1" },
      },
      storage,
    );
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValueOnce(jsonResponse({ message: "JWT access token has expired." }, false, 401))
      .mockResolvedValueOnce(jsonResponse({ message: "Refresh token has expired." }, false, 401));

    await expect(
      fetchWithSessionRefresh(
        "https://api.salense.test/dashboard/today",
        {},
        {
          accessToken: "expired-access",
          baseUrl: "https://api.salense.test",
          fetchImpl,
          storage,
        },
      ),
    ).rejects.toThrow(SessionExpiredError);

    expect(readDemoSession(storage)).toBeNull();
  });
});

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    json: async () => body,
    ok,
    status,
  } as Response;
}

function getAuthorization(init: RequestInit | undefined): string | null {
  return new Headers(init?.headers).get("authorization");
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
