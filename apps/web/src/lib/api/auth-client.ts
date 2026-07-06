import { getDefaultApiBaseUrl } from "./store-integrations-client";

export interface RegisterInput {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly password: string;
  readonly confirmPassword: string;
  readonly companyName: string;
}

export interface RegistrationResponse {
  readonly user: {
    readonly id: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly email: string;
    readonly emailVerified: boolean;
  };
  readonly business: {
    readonly id: string;
    readonly name: string;
  };
}

export interface LoginInput {
  readonly email: string;
  readonly password: string;
}

export interface LoginSessionResponse {
  readonly user: {
    readonly id: string;
    readonly email: string;
    readonly emailVerified: true;
  };
  readonly accessToken: string;
  readonly accessTokenExpiresIn: string;
  readonly refreshToken: string;
  readonly refreshTokenExpiresIn: string;
}

export interface CurrentUserResponse {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly emailVerified: boolean;
}

export interface CompanyProfileInput {
  readonly businessName: string;
  readonly businessLogoUrl?: string | null;
  readonly country: string;
  readonly timeZone: string;
  readonly currency: string;
  readonly taxPreference: string;
  readonly industry: string;
}

export interface CompanyProfileResponse {
  readonly id: string;
  readonly businessName: string;
  readonly businessLogoUrl: string | null;
  readonly country: string;
  readonly currency: string;
  readonly industry: string;
  readonly taxPreference: string;
  readonly timeZone: string;
}

export interface AuthApiClient {
  register(input: RegisterInput): Promise<RegistrationResponse>;
  login(input: LoginInput): Promise<LoginSessionResponse>;
  refreshSession(refreshToken: string): Promise<RefreshSessionResponse>;
  verifyEmail(token: string): Promise<{ readonly emailVerified: true }>;
  requestPasswordReset(email: string): Promise<{ readonly passwordResetRequested: true }>;
  confirmPasswordReset(input: {
    readonly token: string;
    readonly password: string;
    readonly confirmPassword: string;
  }): Promise<{ readonly passwordReset: true }>;
  getCurrentUser(accessToken: string): Promise<CurrentUserResponse>;
  getCompanyProfile(accessToken: string): Promise<CompanyProfileResponse>;
  changePassword(
    accessToken: string,
    input: {
      readonly currentPassword: string;
      readonly newPassword: string;
      readonly confirmNewPassword: string;
    },
  ): Promise<{ readonly passwordChanged: true }>;
  updateCompanyProfile(
    accessToken: string,
    input: CompanyProfileInput,
  ): Promise<CompanyProfileResponse>;
  logout(refreshToken: string): Promise<{ readonly loggedOut: true }>;
}

export interface RefreshSessionResponse {
  readonly user: {
    readonly id: string;
    readonly email: string;
    readonly emailVerified: true;
  };
  readonly accessToken: string;
  readonly accessTokenExpiresIn: string;
}

export class AuthClientError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthClientError";
    this.status = status;
  }
}

interface AuthApiClientOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

export function createAuthApiClient(options: AuthApiClientOptions = {}): AuthApiClient {
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

    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers,
    });

    if (!response.ok) {
      throw new AuthClientError(await getErrorMessage(response), response.status);
    }

    return (await response.json()) as TResponse;
  }

  return {
    changePassword(accessToken, input) {
      return request(
        "/auth/change-password",
        {
          body: JSON.stringify(input),
          method: "POST",
        },
        accessToken,
      );
    },
    confirmPasswordReset(input) {
      return request("/auth/password-reset/confirm", {
        body: JSON.stringify(input),
        method: "POST",
      });
    },
    getCurrentUser(accessToken) {
      return request("/auth/me", undefined, accessToken);
    },
    getCompanyProfile(accessToken) {
      return request("/users/company-profile", undefined, accessToken);
    },
    login(input) {
      return request("/auth/login", {
        body: JSON.stringify({
          email: input.email.trim().toLowerCase(),
          password: input.password,
        }),
        method: "POST",
      });
    },
    refreshSession(refreshToken) {
      return request("/auth/refresh", {
        body: JSON.stringify({ refreshToken }),
        method: "POST",
      });
    },
    logout(refreshToken) {
      return request("/auth/logout", {
        body: JSON.stringify({ refreshToken }),
        method: "POST",
      });
    },
    register(input) {
      return request("/auth/register", {
        body: JSON.stringify({
          ...input,
          email: input.email.trim().toLowerCase(),
        }),
        method: "POST",
      });
    },
    requestPasswordReset(email) {
      return request("/auth/password-reset", {
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
        method: "POST",
      });
    },
    updateCompanyProfile(accessToken, input) {
      return request(
        "/users/company-profile",
        {
          body: JSON.stringify({
            ...input,
            country: input.country.trim().toUpperCase(),
            currency: input.currency.trim().toUpperCase(),
          }),
          method: "PUT",
        },
        accessToken,
      );
    },
    verifyEmail(token) {
      return request("/auth/email-verification", {
        body: JSON.stringify({ token }),
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
    return "We could not complete the request. Please try again.";
  }

  return "We could not complete the request. Please try again.";
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, "");
}
