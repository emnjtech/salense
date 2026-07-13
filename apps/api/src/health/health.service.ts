import { Inject, Injectable } from "@nestjs/common";
import { Redis } from "ioredis";
import { PrismaService } from "../database/prisma.service.js";

export interface HealthCheckResponse {
  readonly status: "ok" | "degraded";
  readonly checks: {
    readonly api: HealthCheckResult;
    readonly database: HealthCheckResult;
    readonly redis: HealthCheckResult;
  };
  readonly checkedAt: string;
}

interface HealthCheckResult {
  readonly status: "ok" | "error";
  readonly message?: string;
}

@Injectable()
export class HealthService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async checkReadiness(): Promise<HealthCheckResponse> {
    const [database, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()]);
    const status = database.status === "ok" && redis.status === "ok" ? "ok" : "degraded";

    return {
      checkedAt: new Date().toISOString(),
      checks: {
        api: { status: "ok" },
        database,
        redis,
      },
      status,
    };
  }

  private async checkDatabase(): Promise<HealthCheckResult> {
    try {
      await this.prismaService.client.$queryRaw`SELECT 1`;

      return { status: "ok" };
    } catch {
      return {
        message: "Database is not ready.",
        status: "error",
      };
    }
  }

  private async checkRedis(): Promise<HealthCheckResult> {
    const redisUrl = process.env.REDIS_URL?.trim();

    if (!redisUrl) {
      return {
        message: "Redis is not configured.",
        status: "error",
      };
    }

    const redis = new Redis(redisUrl, {
      connectTimeout: 3000,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });

    try {
      await redis.connect();
      const pong = await redis.ping();

      return pong === "PONG"
        ? { status: "ok" }
        : { message: "Redis did not return PONG.", status: "error" };
    } catch {
      return {
        message: "Redis is not ready.",
        status: "error",
      };
    } finally {
      redis.disconnect();
    }
  }
}
