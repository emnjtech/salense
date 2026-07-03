import type { LoginSessionResponse } from "./api/auth-client";

export interface DemoSession {
  readonly accessToken: string;
  readonly accessTokenExpiresIn: string;
  readonly refreshToken: string;
  readonly refreshTokenExpiresIn: string;
  readonly userEmail: string;
  readonly userId: string;
}

export interface SessionStoragePort {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

const sessionKeys = {
  accessToken: "salense.accessToken",
  accessTokenExpiresIn: "salense.accessTokenExpiresIn",
  refreshToken: "salense.refreshToken",
  refreshTokenExpiresIn: "salense.refreshTokenExpiresIn",
  userEmail: "salense.userEmail",
  userId: "salense.userId",
} as const;

export function saveDemoSession(
  session: LoginSessionResponse,
  storage: SessionStoragePort = getBrowserStorage(),
): void {
  storage.setItem(sessionKeys.accessToken, session.accessToken);
  storage.setItem(sessionKeys.accessTokenExpiresIn, session.accessTokenExpiresIn);
  storage.setItem(sessionKeys.refreshToken, session.refreshToken);
  storage.setItem(sessionKeys.refreshTokenExpiresIn, session.refreshTokenExpiresIn);
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

  return {
    accessToken,
    accessTokenExpiresIn: storage.getItem(sessionKeys.accessTokenExpiresIn) ?? "",
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
