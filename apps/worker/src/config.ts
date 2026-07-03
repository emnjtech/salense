export interface RedisConnectionOptions {
  readonly db?: number;
  readonly host: string;
  readonly password?: string;
  readonly port: number;
  readonly username?: string;
}

export interface SyncWorkerConfig {
  readonly redis: RedisConnectionOptions;
}

export function loadSyncWorkerConfig(
  env: NodeJS.ProcessEnv = process.env,
): SyncWorkerConfig {
  const redisUrl = env.REDIS_URL?.trim();

  if (!redisUrl) {
    throw new Error("REDIS_URL is required to start the Salense sync worker.");
  }

  return { redis: parseRedisUrl(redisUrl) };
}

export function parseRedisUrl(redisUrl: string): RedisConnectionOptions {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(redisUrl);
  } catch {
    throw new Error("REDIS_URL must be a valid Redis connection URL.");
  }

  if (parsedUrl.protocol !== "redis:" && parsedUrl.protocol !== "rediss:") {
    throw new Error("REDIS_URL must use redis:// or rediss://.");
  }

  const parsedDb = parsedUrl.pathname ? Number.parseInt(parsedUrl.pathname.slice(1), 10) : NaN;

  return {
    ...(Number.isFinite(parsedDb) ? { db: parsedDb } : {}),
    host: parsedUrl.hostname,
    ...(parsedUrl.password ? { password: decodeURIComponent(parsedUrl.password) } : {}),
    port: parsedUrl.port ? Number.parseInt(parsedUrl.port, 10) : 6379,
    ...(parsedUrl.username ? { username: decodeURIComponent(parsedUrl.username) } : {}),
  };
}
