import { Inject, Injectable } from "@nestjs/common";
import { IntegrationError } from "@salense/integrations";
import { sanitizeAuditMetadata } from "../../audit/index.js";
import { PrismaService } from "../../database/prisma.service.js";
import type { StorePlatform } from "../types/store-platform.enum.js";
import {
  CommerceSyncCursorStatus,
  type CommerceSyncCursorRecord,
  type CommerceSyncCursorResource,
} from "./commerce-sync-cursor.types.js";

interface CommerceSyncCursorPrismaClient {
  readonly commerceSyncCursor: {
    findUnique(args: {
      readonly where: {
        readonly connectedStoreId_resource: {
          readonly connectedStoreId: string;
          readonly resource: CommerceSyncCursorResource;
        };
      };
      readonly select: CommerceSyncCursorSelect;
    }): Promise<CommerceSyncCursorRecord | null>;
    upsert(args: {
      readonly where: {
        readonly connectedStoreId_resource: {
          readonly connectedStoreId: string;
          readonly resource: CommerceSyncCursorResource;
        };
      };
      readonly create: CommerceSyncCursorCreateData;
      readonly update: CommerceSyncCursorUpdateData;
      readonly select: { readonly id: true };
    }): Promise<unknown>;
  };
}

interface CommerceSyncCursorSelect {
  readonly businessId: true;
  readonly connectedStoreId: true;
  readonly errorMetadata: true;
  readonly lastAttemptedSyncedAt: true;
  readonly lastSuccessfulSyncedAt: true;
  readonly platform: true;
  readonly resource: true;
  readonly status: true;
}

interface CommerceSyncCursorCreateData {
  readonly businessId: string;
  readonly connectedStoreId: string;
  readonly errorMetadata?: Readonly<Record<string, unknown>> | null;
  readonly lastAttemptedSyncedAt: Date;
  readonly lastSuccessfulSyncedAt?: Date | null;
  readonly platform: StorePlatform;
  readonly resource: CommerceSyncCursorResource;
  readonly status: CommerceSyncCursorStatus;
}

interface CommerceSyncCursorUpdateData {
  readonly errorMetadata?: Readonly<Record<string, unknown>> | null;
  readonly lastAttemptedSyncedAt: Date;
  readonly lastSuccessfulSyncedAt?: Date | null;
  readonly status: CommerceSyncCursorStatus;
}

const commerceSyncCursorSelect = {
  businessId: true,
  connectedStoreId: true,
  errorMetadata: true,
  lastAttemptedSyncedAt: true,
  lastSuccessfulSyncedAt: true,
  platform: true,
  resource: true,
  status: true,
} satisfies CommerceSyncCursorSelect;

@Injectable()
export class CommerceSyncCursorService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async getCursor(
    connectedStoreId: string,
    resource: CommerceSyncCursorResource,
  ): Promise<CommerceSyncCursorRecord | null> {
    return this.prisma.commerceSyncCursor.findUnique({
      where: { connectedStoreId_resource: { connectedStoreId, resource } },
      select: commerceSyncCursorSelect,
    });
  }

  async recordSuccess(input: {
    readonly businessId: string;
    readonly connectedStoreId: string;
    readonly platform: StorePlatform;
    readonly resource: CommerceSyncCursorResource;
    readonly syncedAt: Date;
  }): Promise<void> {
    await this.prisma.commerceSyncCursor.upsert({
      where: {
        connectedStoreId_resource: {
          connectedStoreId: input.connectedStoreId,
          resource: input.resource,
        },
      },
      create: {
        businessId: input.businessId,
        connectedStoreId: input.connectedStoreId,
        errorMetadata: null,
        lastAttemptedSyncedAt: input.syncedAt,
        lastSuccessfulSyncedAt: input.syncedAt,
        platform: input.platform,
        resource: input.resource,
        status: CommerceSyncCursorStatus.Success,
      },
      update: {
        errorMetadata: null,
        lastAttemptedSyncedAt: input.syncedAt,
        lastSuccessfulSyncedAt: input.syncedAt,
        status: CommerceSyncCursorStatus.Success,
      },
      select: { id: true },
    });
  }

  async recordFailure(input: {
    readonly businessId: string;
    readonly connectedStoreId: string;
    readonly error: unknown;
    readonly platform: StorePlatform;
    readonly resource: CommerceSyncCursorResource;
    readonly attemptedAt: Date;
  }): Promise<void> {
    const failureSummary = getSafeSyncFailureSummary(input.error);
    const errorMetadata = sanitizeAuditMetadata({
      category: failureSummary.category,
      ...getSafeIntegrationErrorMetadata(input.error),
      errorName: input.error instanceof Error ? input.error.name : "UnknownError",
      message: failureSummary.message,
    });

    await this.prisma.commerceSyncCursor.upsert({
      where: {
        connectedStoreId_resource: {
          connectedStoreId: input.connectedStoreId,
          resource: input.resource,
        },
      },
      create: {
        businessId: input.businessId,
        connectedStoreId: input.connectedStoreId,
        errorMetadata,
        lastAttemptedSyncedAt: input.attemptedAt,
        platform: input.platform,
        resource: input.resource,
        status: CommerceSyncCursorStatus.Error,
      },
      update: {
        errorMetadata,
        lastAttemptedSyncedAt: input.attemptedAt,
        status: CommerceSyncCursorStatus.Error,
      },
      select: { id: true },
    });
  }

  private get prisma(): CommerceSyncCursorPrismaClient {
    return this.prismaService.client as unknown as CommerceSyncCursorPrismaClient;
  }
}

function getSafeIntegrationErrorMetadata(error: unknown): Readonly<Record<string, unknown>> {
  if (!(error instanceof IntegrationError)) {
    return {};
  }

  return sanitizeAuditMetadata({
    endpoint: error.metadata?.endpoint,
    fallbackAuthMethod: error.metadata?.fallbackAuthMethod,
    fallbackStatus: error.metadata?.fallbackStatus,
    status: error.metadata?.status,
  });
}

function getSafeSyncFailureSummary(error: unknown): {
  readonly category: string;
  readonly message: string;
} {
  if (!(error instanceof Error)) {
    return {
      category: "UNKNOWN",
      message: "WooCommerce sync failed. Please retry synchronization.",
    };
  }

  const message = error.message.toLowerCase();

  if (error.name.includes("Authentication") || message.includes("auth")) {
    return {
      category: "AUTHENTICATION",
      message: "WooCommerce rejected the credentials. Check the read-only REST API key and secret.",
    };
  }

  if (message.includes("encrypt") || message.includes("decrypt") || message.includes("credential")) {
    return {
      category: "CREDENTIAL_CONFIGURATION",
      message:
        "The worker could not decrypt stored credentials. Restart API and worker with the same encryption key.",
    };
  }

  if (
    message.includes("unreachable") ||
    message.includes("url") ||
    message.includes("timed out") ||
    message.includes("timeout")
  ) {
    return {
      category: "STORE_REACHABILITY",
      message: appendSafeIntegrationDetails(
        "The WooCommerce store URL could not be reached. Check the URL and store availability.",
        error,
      ),
    };
  }

  if (message.includes("rate limit")) {
    return {
      category: "RATE_LIMIT",
      message: "WooCommerce rate limited the sync request. Retry synchronization shortly.",
    };
  }

  return {
    category: "SYNC_FAILED",
    message: "WooCommerce sync failed. Please retry synchronization.",
  };
}

function appendSafeIntegrationDetails(message: string, error: unknown): string {
  if (!(error instanceof IntegrationError)) {
    return message;
  }

  const endpoint = typeof error.metadata?.endpoint === "string" ? error.metadata.endpoint : undefined;
  const status = typeof error.metadata?.status === "number" ? error.metadata.status : undefined;
  const fallbackStatus =
    typeof error.metadata?.fallbackStatus === "number" ? error.metadata.fallbackStatus : undefined;
  const details = [
    endpoint ? `endpoint ${endpoint}` : undefined,
    status ? `HTTP ${status}` : undefined,
    fallbackStatus ? `fallback HTTP ${fallbackStatus}` : undefined,
  ]
    .filter(Boolean)
    .join(", ");

  return details ? `${message} (${details})` : message;
}
