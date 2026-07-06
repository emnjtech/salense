import { createPlatformAdminApiClient } from "../api/platform-admin-client";

describe("platform admin API client", () => {
  it("logs in through the platform admin endpoint", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(
        jsonResponse({
          accessToken: "admin.access.jwt",
          accessTokenExpiresIn: "15m",
          admin: {
            email: "admin@salense.local",
            firstName: "Salense",
            id: "admin_1",
            lastName: "Admin",
            role: "SUPER_ADMIN",
            status: "ACTIVE",
          },
          refreshToken: "admin.refresh.jwt",
          refreshTokenExpiresIn: "7d",
        }),
      );
    const client = createPlatformAdminApiClient({
      baseUrl: "https://api.salense.test/",
      fetchImpl,
    });

    await expect(
      client.login({ email: "ADMIN@SALENSE.LOCAL", password: "AdminPassword123!" }),
    ).resolves.toMatchObject({
      admin: { email: "admin@salense.local", role: "SUPER_ADMIN" },
    });
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://api.salense.test/platform-admin/auth/login",
    );
  });

  it("uses admin authorization for profile requests", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(
        jsonResponse({
          email: "admin@salense.local",
          firstName: "Salense",
          id: "admin_1",
          lastLoginAt: null,
          lastName: "Admin",
          role: "SUPER_ADMIN",
          status: "ACTIVE",
        }),
      );
    const client = createPlatformAdminApiClient({
      baseUrl: "https://api.salense.test",
      fetchImpl,
    });

    await expect(client.getProfile("admin.access.jwt")).resolves.toMatchObject({
      email: "admin@salense.local",
    });
    expect(new Headers(fetchImpl.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(
      "Bearer admin.access.jwt",
    );
  });
});

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    json: async () => body,
    ok,
    status,
  } as Response;
}
