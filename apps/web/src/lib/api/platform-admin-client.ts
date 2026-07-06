import { getDefaultApiBaseUrl } from "./store-integrations-client";
import { fetchWithAdminSessionRefresh } from "../admin-session";

export interface PlatformAdminSessionResponse {
  readonly admin: {
    readonly id: string;
    readonly email: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly role: "SUPER_ADMIN";
    readonly status: "ACTIVE";
  };
  readonly accessToken: string;
  readonly accessTokenExpiresIn: string;
  readonly refreshToken: string;
  readonly refreshTokenExpiresIn: string;
}

export interface PlatformAdminRefreshResponse {
  readonly admin: PlatformAdminSessionResponse["admin"];
  readonly accessToken: string;
  readonly accessTokenExpiresIn: string;
}

export interface PlatformAdminProfile {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: "SUPER_ADMIN";
  readonly status: "ACTIVE" | "DISABLED";
  readonly lastLoginAt: string | null;
}

export interface PlatformAdminApiClient {
  login(input: {
    readonly email: string;
    readonly password: string;
  }): Promise<PlatformAdminSessionResponse>;
  getProfile(accessToken?: string): Promise<PlatformAdminProfile>;
  changePassword(
    accessToken: string | undefined,
    input: {
      readonly currentPassword: string;
      readonly newPassword: string;
      readonly confirmNewPassword: string;
    },
  ): Promise<{ readonly passwordChanged: true }>;
  logout(refreshToken: string): Promise<{ readonly loggedOut: true }>;
}

interface PlatformAdminClientOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

export function createPlatformAdminApiClient(
  options: PlatformAdminClientOptions = {},
): PlatformAdminApiClient {
  const baseUrl = trimTrailingSlash(options.baseUrl ?? getDefaultApiBaseUrl());
  const fetchImpl = options.fetchImpl ?? fetch;

  async function request<TResponse>(
    path: string,
    init: RequestInit = {},
    accessToken?: string,
  ): Promise<TResponse> {
    const headers = new Headers(init.headers);

    if (init.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    if (accessToken) {
      headers.set("authorization", `Bearer ${accessToken}`);
    }

    const response = await fetchImpl(`${baseUrl}${path}`, { ...init, headers });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response));
    }

    return (await response.json()) as TResponse;
  }

  return {
    changePassword(accessToken, input) {
      return fetchWithAdminSessionRefresh(
        `${baseUrl}/platform-admin/auth/change-password`,
        {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
        { accessToken, baseUrl, fetchImpl },
      ).then(async (response) => {
        if (!response.ok) {
          throw new Error(await getErrorMessage(response));
        }

        return (await response.json()) as { readonly passwordChanged: true };
      });
    },
    getProfile(accessToken) {
      return fetchWithAdminSessionRefresh(
        `${baseUrl}/platform-admin/auth/me`,
        undefined,
        { accessToken, baseUrl, fetchImpl },
      ).then(async (response) => {
        if (!response.ok) {
          throw new Error(await getErrorMessage(response));
        }

        return (await response.json()) as PlatformAdminProfile;
      });
    },
    login(input) {
      return request("/platform-admin/auth/login", {
        body: JSON.stringify({
          email: input.email.trim().toLowerCase(),
          password: input.password,
        }),
        method: "POST",
      });
    },
    logout(refreshToken) {
      return request("/platform-admin/auth/logout", {
        body: JSON.stringify({ refreshToken }),
        method: "POST",
      });
    },
  };
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { readonly message?: unknown };

    if (typeof body.message === "string") {
      return body.message;
    }

    if (Array.isArray(body.message)) {
      return body.message.filter((message) => typeof message === "string").join(" ");
    }
  } catch {
    return "We could not complete the admin request. Please try again.";
  }

  return "We could not complete the admin request. Please try again.";
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, "");
}
