import type { PrismaService } from "../../../database/prisma.service.js";
import { StorePlatform } from "../../types/store-platform.enum.js";
import { CommerceSyncCursorService } from "../commerce-sync-cursor.service.js";
import {
  CommerceSyncCursorResource,
  CommerceSyncCursorStatus,
} from "../commerce-sync-cursor.types.js";

function createServiceMocks() {
  const findUnique = jest.fn();
  const upsert = jest.fn().mockResolvedValue({ id: "cursor_1" });
  const service = new CommerceSyncCursorService({
    client: { commerceSyncCursor: { findUnique, upsert } },
  } as unknown as PrismaService);

  return { findUnique, service, upsert };
}

describe("CommerceSyncCursorService", () => {
  it("reads a per-store per-resource cursor", async () => {
    const { findUnique, service } = createServiceMocks();
    const cursor = {
      businessId: "business_1",
      connectedStoreId: "store_1",
      errorMetadata: null,
      lastAttemptedSyncedAt: new Date("2026-07-03T12:00:00.000Z"),
      lastSuccessfulSyncedAt: new Date("2026-07-03T12:00:00.000Z"),
      platform: StorePlatform.WooCommerce,
      resource: CommerceSyncCursorResource.Orders,
      status: CommerceSyncCursorStatus.Success,
    };
    findUnique.mockResolvedValue(cursor);

    await expect(
      service.getCursor("store_1", CommerceSyncCursorResource.Orders),
    ).resolves.toBe(cursor);
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        connectedStoreId_resource: {
          connectedStoreId: "store_1",
          resource: CommerceSyncCursorResource.Orders,
        },
      },
      select: expect.objectContaining({ lastSuccessfulSyncedAt: true }),
    });
  });

  it("upserts successful cursor state", async () => {
    const { service, upsert } = createServiceMocks();
    const syncedAt = new Date("2026-07-03T12:00:00.000Z");

    await service.recordSuccess({
      businessId: "business_1",
      connectedStoreId: "store_1",
      platform: StorePlatform.WooCommerce,
      resource: CommerceSyncCursorResource.Products,
      syncedAt,
    });

    expect(upsert).toHaveBeenCalledWith({
      where: {
        connectedStoreId_resource: {
          connectedStoreId: "store_1",
          resource: CommerceSyncCursorResource.Products,
        },
      },
      create: expect.objectContaining({
        errorMetadata: null,
        lastAttemptedSyncedAt: syncedAt,
        lastSuccessfulSyncedAt: syncedAt,
        status: CommerceSyncCursorStatus.Success,
      }),
      update: {
        errorMetadata: null,
        lastAttemptedSyncedAt: syncedAt,
        lastSuccessfulSyncedAt: syncedAt,
        status: CommerceSyncCursorStatus.Success,
      },
      select: { id: true },
    });
  });

  it("records safe failure metadata without sensitive values", async () => {
    const { service, upsert } = createServiceMocks();
    const attemptedAt = new Date("2026-07-03T12:00:00.000Z");

    await service.recordFailure({
      attemptedAt,
      businessId: "business_1",
      connectedStoreId: "store_1",
      error: new Error("failed with ck_live and cs_live secrets"),
      platform: StorePlatform.WooCommerce,
      resource: CommerceSyncCursorResource.Refunds,
    });

    const serialized = JSON.stringify(upsert.mock.calls);
    expect(serialized).not.toContain("ck_live");
    expect(serialized).not.toContain("cs_live");
    expect(upsert).toHaveBeenCalledWith({
      where: {
        connectedStoreId_resource: {
          connectedStoreId: "store_1",
          resource: CommerceSyncCursorResource.Refunds,
        },
      },
      create: expect.objectContaining({
        errorMetadata: { errorName: "Error", message: "WooCommerce sync failed." },
        lastAttemptedSyncedAt: attemptedAt,
        status: CommerceSyncCursorStatus.Error,
      }),
      update: {
        errorMetadata: { errorName: "Error", message: "WooCommerce sync failed." },
        lastAttemptedSyncedAt: attemptedAt,
        status: CommerceSyncCursorStatus.Error,
      },
      select: { id: true },
    });
  });
});
