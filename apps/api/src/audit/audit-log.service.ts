import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import type { CreateAuditLogEntry } from "./types/audit-log.type.js";

interface AuditLogPrismaClient {
  readonly auditLog: {
    create(args: {
      readonly data: {
        readonly userId: string;
        readonly businessId: string;
        readonly action: string;
        readonly affectedModule: string;
        readonly affectedStoreId?: string;
        readonly affectedPlatform?: string;
        readonly result: string;
        readonly metadata?: Readonly<Record<string, unknown>>;
      };
    }): Promise<unknown>;
  };
}

const sensitiveMetadataKeyPattern =
  /(password|secret|token|credential|hash|encrypted|authorization|raw|payload)/i;

@Injectable()
export class AuditLogService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async record(entry: CreateAuditLogEntry): Promise<void> {
    const prisma = this.prismaService.client as unknown as AuditLogPrismaClient;
    const metadata = sanitizeAuditMetadata(entry.metadata ?? {});

    await prisma.auditLog.create({
      data: {
        action: entry.action,
        affectedModule: entry.affectedModule,
        ...(entry.affectedPlatform ? { affectedPlatform: entry.affectedPlatform } : {}),
        ...(entry.affectedStoreId ? { affectedStoreId: entry.affectedStoreId } : {}),
        businessId: entry.businessId,
        ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
        result: entry.result,
        userId: entry.userId,
      },
    });
  }
}

export function sanitizeAuditMetadata(
  metadata: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(metadata).flatMap(([key, value]) => {
      if (sensitiveMetadataKeyPattern.test(key)) {
        return [];
      }

      if (Array.isArray(value)) {
        return [[key, value.map(sanitizeAuditValue)]];
      }

      if (isPlainObject(value)) {
        const sanitizedValue = sanitizeAuditMetadata(value);

        return Object.keys(sanitizedValue).length > 0 ? [[key, sanitizedValue]] : [];
      }

      return [[key, value]];
    }),
  );
}

function sanitizeAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeAuditValue);
  }

  if (isPlainObject(value)) {
    return sanitizeAuditMetadata(value);
  }

  return value;
}

function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
