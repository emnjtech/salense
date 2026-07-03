import { loadSyncWorkerConfig, parseRedisUrl } from "../config.js";

describe("sync worker config", () => {
  it("loads Redis configuration from REDIS_URL", () => {
    expect(
      loadSyncWorkerConfig({ REDIS_URL: "redis://user:secret@localhost:6380/2" }).redis,
    ).toEqual({
      db: 2,
      host: "localhost",
      password: "secret",
      port: 6380,
      username: "user",
    });
  });

  it("fails clearly when Redis config is missing", () => {
    expect(() => loadSyncWorkerConfig({})).toThrow(
      "REDIS_URL is required to start the Salense sync worker.",
    );
  });

  it("does not include credentials in invalid config errors", () => {
    expect(() => parseRedisUrl("postgres://user:super-secret@example.com:5432/1")).toThrow(
      "REDIS_URL must use redis:// or rediss://.",
    );

    try {
      parseRedisUrl("postgres://user:super-secret@example.com:5432/1");
    } catch (error) {
      expect(String(error)).not.toContain("super-secret");
      expect(String(error)).not.toContain("user");
    }
  });
});
