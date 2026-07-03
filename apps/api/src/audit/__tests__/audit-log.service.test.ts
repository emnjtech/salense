import type { PrismaService } from "../../database/prisma.service.js";
import { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";
import { AuditLogService, sanitizeAuditMetadata } from "../audit-log.service.js";
import { AuditAction, AuditLogModule, AuditLogResult } from "../types/audit-log.type.js";

describe("AuditLogService", () => {
  it("persists a sanitized append-only audit entry", async () => {
    const createAuditLog = jest.fn().mockResolvedValue({ id: "audit_1" });
    const service = new AuditLogService({
      client: { auditLog: { create: createAuditLog } },
    } as unknown as PrismaService);

    await service.record({
      action: AuditAction.ManualSyncJobQueued,
      affectedModule: AuditLogModule.StoreIntegrations,
      affectedPlatform: StorePlatform.WooCommerce,
      affectedStoreId: "store_1",
      businessId: "business_1",
      metadata: {
        jobId: "job_1",
        accessToken: "should-not-log",
        nested: {
          encryptedCredential: "should-not-log",
          resource: "orders",
        },
      },
      result: AuditLogResult.Success,
      userId: "user_1",
    });

    expect(createAuditLog).toHaveBeenCalledWith({
      data: {
        action: AuditAction.ManualSyncJobQueued,
        affectedModule: AuditLogModule.StoreIntegrations,
        affectedPlatform: StorePlatform.WooCommerce,
        affectedStoreId: "store_1",
        businessId: "business_1",
        metadata: {
          jobId: "job_1",
          nested: { resource: "orders" },
        },
        result: AuditLogResult.Success,
        userId: "user_1",
      },
    });
  });

  it("exposes no update or delete behavior", () => {
    const service = new AuditLogService({
      client: { auditLog: { create: jest.fn() } },
    } as unknown as PrismaService) as unknown as Record<string, unknown>;

    expect(service.record).toEqual(expect.any(Function));
    expect(service.update).toBeUndefined();
    expect(service.delete).toBeUndefined();
    expect(service.deleteMany).toBeUndefined();
  });

  it("removes sensitive metadata recursively", () => {
    expect(
      sanitizeAuditMetadata({
        apiVersion: "wc/v3",
        password: "should-not-log",
        rawMarketplacePayload: { id: 1 },
        records: [
          {
            credentialHash: "should-not-log",
            status: "CONNECTED",
          },
        ],
      }),
    ).toEqual({
      apiVersion: "wc/v3",
      records: [{ status: "CONNECTED" }],
    });
  });
});
