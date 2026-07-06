import type {
  PlatformAdminRefreshResponse,
  PlatformAdminSessionResponse,
} from "./api/platform-admin-client";

export interface AdminSession {
  readonly accessToken: string;
  readonly accessTokenExpiresIn: string;
  readonly refreshToken: string;
  readonly refreshTokenExpiresIn: string;
  readonly adminEmail: string;
  readonly adminId: string;
}

export interface AdminSessionStoragePort {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

const adminSessionKeys = {
  accessToken: "salense.admin.accessToken",
  accessTokenExpiresIn: "salense.admin.accessTokenExpiresIn",
  refreshToken: "salense.admin.refreshToken",
  refreshTokenExpiresIn: "salense.admin.refreshTokenExpiresIn",
  adminEmail: "salense.admin.email",
  adminId: "salense.admin.id",
} as const;

let adminRefreshPromise: Promise<string> | null = null;

export function saveAdminSession(
  session: PlatformAdminSessionResponse,
  storage: AdminSessionStoragePort = getBrowserStorage(),
): void {
  storage.setItem(adminSessionKeys.accessToken, session.accessToken);
  storage.setItem(adminSessionKeys.accessTokenExpiresIn, session.accessTokenExpiresIn);
  storage.setItem(adminSessionKeys.refreshToken, session.refreshToken);
  storage.setItem(adminSessionKeys.refreshTokenExpiresIn, session.refreshTokenExpiresIn);
  storage.setItem(adminSessionKeys.adminEmail, session.admin.email);
  storage.setItem(adminSessionKeys.adminId, session.admin.id);
}

export function updateAdminAccessToken(
  session: PlatformAdminRefreshResponse,
  storage: AdminSessionStoragePort = getBrowserStorage(),
): void {
  storage.setItem(adminSessionKeys.accessToken, session.accessToken);
  storage.setItem(adminSessionKeys.accessTokenExpiresIn, session.accessTokenExpiresIn);
  storage.setItem(adminSessionKeys.adminEmail, session.admin.email);
  storage.setItem(adminSessionKeys.adminId, session.admin.id);
}

export function readAdminSession(
  storage: AdminSessionStoragePort = getBrowserStorage(),
): AdminSession | null {
  const accessToken = storage.getItem(adminSessionKeys.accessToken);
  const refreshToken = storage.getItem(adminSessionKeys.refreshToken);
  const adminEmail = storage.getItem(adminSessionKeys.adminEmail);
  const adminId = storage.getItem(adminSessionKeys.adminId);

  if (!accessToken || !refreshToken || !adminEmail || !adminId) {
    return null;
  }

  return {
    accessToken,
    accessTokenExpiresIn: storage.getItem(adminSessionKeys.accessTokenExpiresIn) ?? "",
    refreshToken,
    refreshTokenExpiresIn: storage.getItem(adminSessionKeys.refreshTokenExpiresIn) ?? "",
    adminEmail,
    adminId,
  };
}

export function clearAdminSession(storage: AdminSessionStoragePort = getBrowserStorage()): void {
  Object.values(adminSessionKeys).forEach((key) => storage.removeItem(key));
}

export async function fetchWithAdminSessionRefresh(
  input: string,
  init: RequestInit = {},
  options: {
    readonly accessToken?: string | undefined;
    readonly baseUrl?: string | undefined;
    readonly fetchImpl?: typeof fetch;
    readonly storage?: AdminSessionStoragePort;
  } = {},
): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const storage = options.storage ?? getBrowserStorage();
  const session = readAdminSession(storage);
  const accessToken = options.accessToken ?? session?.accessToken;
  const firstResponse = await fetchImpl(input, withAuthorization(init, accessToken));

  if (firstResponse.status !== 401 || !session?.refreshToken) {
    return firstResponse;
  }

  try {
    const refreshedAccessToken = await refreshAdminAccessToken({
      baseUrl: options.baseUrl,
      fetchImpl,
      storage,
    });

    return fetchImpl(input, withAuthorization(init, refreshedAccessToken));
  } catch {
    clearAdminSession(storage);
    throw new Error("Your admin session has expired. Please sign in again.");
  }
}

function refreshAdminAccessToken({
  baseUrl,
  fetchImpl,
  storage,
}: {
  readonly baseUrl?: string | undefined;
  readonly fetchImpl: typeof fetch;
  readonly storage: AdminSessionStoragePort;
}): Promise<string> {
  if (!adminRefreshPromise) {
    adminRefreshPromise = requestAdminAccessTokenRefresh({ baseUrl, fetchImpl, storage }).finally(
      () => {
        adminRefreshPromise = null;
      },
    );
  }

  return adminRefreshPromise;
}

async function requestAdminAccessTokenRefresh({
  baseUrl,
  fetchImpl,
  storage,
}: {
  readonly baseUrl?: string | undefined;
  readonly fetchImpl: typeof fetch;
  readonly storage: AdminSessionStoragePort;
}): Promise<string> {
  const session = readAdminSession(storage);

  if (!session?.refreshToken) {
    throw new Error("Your admin session has expired. Please sign in again.");
  }

  const response = await fetchImpl(
    `${trimTrailingSlash(baseUrl ?? getDefaultApiBaseUrl())}/platform-admin/auth/refresh`,
    {
      body: JSON.stringify({ refreshToken: session.refreshToken }),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error("Your admin session has expired. Please sign in again.");
  }

  const refreshedSession = (await response.json()) as PlatformAdminRefreshResponse;
  updateAdminAccessToken(refreshedSession, storage);

  return refreshedSession.accessToken;
}

function withAuthorization(init: RequestInit, accessToken: string | null | undefined): RequestInit {
  const headers = new Headers(init.headers);

  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  return { ...init, headers };
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, "");
}

function getDefaultApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
}

function getBrowserStorage(): AdminSessionStoragePort {
  if (typeof window === "undefined") {
    return createMemoryStorage();
  }

  return window.localStorage;
}

function createMemoryStorage(): AdminSessionStoragePort {
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
