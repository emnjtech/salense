import type { LoginSessionResponse, RefreshSessionResponse } from "./api/auth-client";

export interface DemoSession {
  readonly accessToken: string;
  readonly accessTokenExpiresIn: string;
  readonly businessName?: string;
  readonly refreshToken: string;
  readonly refreshTokenExpiresIn: string;
  readonly userEmail: string;
  readonly userId: string;
}

export class SessionExpiredError extends Error {
  constructor(message = "Your session has expired. Please sign in again.") {
    super(message);
    this.name = "SessionExpiredError";
  }
}

export interface SessionStoragePort {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

const sessionKeys = {
  accessToken: "salense.accessToken",
  accessTokenExpiresIn: "salense.accessTokenExpiresIn",
  businessName: "salense.businessName",
  refreshToken: "salense.refreshToken",
  refreshTokenExpiresIn: "salense.refreshTokenExpiresIn",
  userEmail: "salense.userEmail",
  userId: "salense.userId",
} as const;

let refreshPromise: Promise<string> | null = null;

export function saveDemoSession(
  session: LoginSessionResponse,
  storage: SessionStoragePort = getBrowserStorage(),
): void {
  storage.setItem(sessionKeys.accessToken, session.accessToken);
  storage.setItem(sessionKeys.accessTokenExpiresIn, session.accessTokenExpiresIn);
  if (session.business?.name) {
    storage.setItem(sessionKeys.businessName, session.business.name);
  } else {
    storage.removeItem(sessionKeys.businessName);
  }
  storage.setItem(sessionKeys.refreshToken, session.refreshToken);
  storage.setItem(sessionKeys.refreshTokenExpiresIn, session.refreshTokenExpiresIn);
  storage.setItem(sessionKeys.userEmail, session.user.email);
  storage.setItem(sessionKeys.userId, session.user.id);
}

export function updateDemoAccessToken(
  session: RefreshSessionResponse,
  storage: SessionStoragePort = getBrowserStorage(),
): void {
  storage.setItem(sessionKeys.accessToken, session.accessToken);
  storage.setItem(sessionKeys.accessTokenExpiresIn, session.accessTokenExpiresIn);
  storage.setItem(sessionKeys.userEmail, session.user.email);
  storage.setItem(sessionKeys.userId, session.user.id);
}

export function readDemoSession(
  storage: SessionStoragePort = getBrowserStorage(),
): DemoSession | null {
  const accessToken = storage.getItem(sessionKeys.accessToken);
  const refreshToken = storage.getItem(sessionKeys.refreshToken);
  const userEmail = storage.getItem(sessionKeys.userEmail);
  const userId = storage.getItem(sessionKeys.userId);

  if (!accessToken || !refreshToken || !userEmail || !userId) {
    return null;
  }

  const businessName = storage.getItem(sessionKeys.businessName);

  return {
    accessToken,
    accessTokenExpiresIn: storage.getItem(sessionKeys.accessTokenExpiresIn) ?? "",
    ...(businessName ? { businessName } : {}),
    refreshToken,
    refreshTokenExpiresIn: storage.getItem(sessionKeys.refreshTokenExpiresIn) ?? "",
    userEmail,
    userId,
  };
}

export function clearDemoSession(storage: SessionStoragePort = getBrowserStorage()): void {
  Object.values(sessionKeys).forEach((key) => storage.removeItem(key));
  storage.removeItem("accessToken");
}

export function getDemoAccessToken(): string | null {
  return readDemoSession()?.accessToken ?? null;
}

export async function fetchWithSessionRefresh(
  input: string,
  init: RequestInit = {},
  options: {
    readonly accessToken?: string | undefined;
    readonly baseUrl?: string | undefined;
    readonly fetchImpl?: typeof fetch;
    readonly storage?: SessionStoragePort;
  } = {},
): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const storage = options.storage ?? getBrowserStorage();
  const session = readDemoSession(storage);
  const accessToken = options.accessToken ?? session?.accessToken;
  const firstResponse = await fetchImpl(input, withAuthorization(init, accessToken));

  if (firstResponse.status !== 401 || !session?.refreshToken) {
    return firstResponse;
  }

  try {
    const refreshedAccessToken = await refreshAccessToken({
      baseUrl: options.baseUrl,
      fetchImpl,
      storage,
    });

    return await fetchImpl(input, withAuthorization(init, refreshedAccessToken));
  } catch {
    clearExpiredSession(storage);
    throw new SessionExpiredError();
  }
}

export function getFriendlyAuthErrorMessage(error: unknown): string | null {
  if (error instanceof SessionExpiredError) {
    return error.message;
  }

  if (error instanceof Error && isRawJwtError(error.message)) {
    return "Your session has expired. Please sign in again.";
  }

  return null;
}

function refreshAccessToken({
  baseUrl,
  fetchImpl,
  storage,
}: {
  readonly baseUrl?: string | undefined;
  readonly fetchImpl: typeof fetch;
  readonly storage: SessionStoragePort;
}): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = requestAccessTokenRefresh({ baseUrl, fetchImpl, storage }).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function requestAccessTokenRefresh({
  baseUrl,
  fetchImpl,
  storage,
}: {
  readonly baseUrl?: string | undefined;
  readonly fetchImpl: typeof fetch;
  readonly storage: SessionStoragePort;
}): Promise<string> {
  const session = readDemoSession(storage);

  if (!session?.refreshToken) {
    throw new SessionExpiredError();
  }

  const response = await fetchImpl(
    `${trimTrailingSlash(baseUrl ?? getDefaultApiBaseUrl())}/auth/refresh`,
    {
      body: JSON.stringify({ refreshToken: session.refreshToken }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new SessionExpiredError();
  }

  const refreshedSession = (await response.json()) as RefreshSessionResponse;
  updateDemoAccessToken(refreshedSession, storage);

  return refreshedSession.accessToken;
}

function withAuthorization(init: RequestInit, accessToken: string | null | undefined): RequestInit {
  const headers = new Headers(init.headers);

  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  return {
    ...init,
    headers,
  };
}

function clearExpiredSession(storage: SessionStoragePort): void {
  clearDemoSession(storage);

  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.assign("/login?reason=session-expired");
  }
}

function isRawJwtError(message: string): boolean {
  return /jwt .*expired|token .*expired|unauthorized/iu.test(message);
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, "");
}

function getDefaultApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "https://api.getsalense.com"
  );
}

function getBrowserStorage(): SessionStoragePort {
  if (typeof window === "undefined") {
    return createMemoryStorage();
  }

  return window.localStorage;
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
