import { UnauthorizedException } from "@nestjs/common";
import type { PrismaService } from "../../database/prisma.service.js";
import { StoreConnectionStatus } from "../../store-integrations/types/store-connection-status.enum.js";
import { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";
import { CommerceInventoryService } from "../commerce-inventory.service.js";

const business = { id: "business_1" } as const;

describe("CommerceInventoryService", () => {
  it("returns safe inventory intelligence fields with deterministic metrics", async () => {
    const { service } = createService({
      orderItems: [
        {
          connectedStoreId: "store_1",
          platform: StorePlatform.WooCommerce,
          platformProductId: "woo_lamp",
          quantity: 15,
        },
      ],
      products: [
        {
          connectedStore: { id: "store_1", storeName: "Main Store" },
          currency: "GBP",
          currentStockQuantity: 2,
          id: "product_db_1",
          name: "Desk Lamp",
          platform: StorePlatform.WooCommerce,
          platformProductId: "woo_lamp",
          priceAmount: "20.00",
          sku: "LAMP-1",
          sourceMetadata: { raw: { categories: [{ name: "Lighting" }] } },
          stockStatus: "lowstock",
        },
      ],
    });

    await expect(service.listInventory("user_1", {})).resolves.toEqual({
      insights: expect.arrayContaining([
        {
          message: "Desk Lamp may run out within 4 days.",
          severity: "WARNING",
          type: "STOCKOUT_RISK",
        },
        {
          message: "1 product is at or below reorder level.",
          severity: "WARNING",
          type: "LOW_STOCK",
        },
      ]),
      inventory: [
        {
          averageDailySales: 0.5,
          category: "Lighting",
          currentStock: 2,
          estimatedDaysRemaining: 4,
          inventoryId: "product_db_1",
          inventoryValue: 40,
          platform: StorePlatform.WooCommerce,
          productName: "Desk Lamp",
          reorderLevel: 5,
          sku: "LAMP-1",
          stockStatus: "lowstock",
          storeName: "Main Store",
        },
      ],
      summary: {
        inventoryValue: 40,
        lowStockProducts: 1,
        outOfStockProducts: 0,
      },
    });
  });

  it("applies platform, stock status, and search filters within the user's business", async () => {
    const { prisma, service } = createService();

    await service.listInventory("user_1", {
      platform: StorePlatform.AmazonSeller,
      search: "lamp",
      stockStatus: "instock",
    });

    expect(prisma.commerceProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: "lamp", mode: "insensitive" } },
            { sku: { contains: "lamp", mode: "insensitive" } },
            { platformProductId: { contains: "lamp", mode: "insensitive" } },
          ],
          businessId: business.id,
          connectedStore: {
            connectionStatus: StoreConnectionStatus.Connected,
            disconnectedAt: null,
          },
          platform: StorePlatform.AmazonSeller,
          stockStatus: "instock",
        },
      }),
    );
  });

  it("filters by category after extracting safe category metadata", async () => {
    const { service } = createService({
      products: [product("product_1", "Lighting"), product("product_2", "Storage")],
    });

    const response = await service.listInventory("user_1", { category: "Storage" });

    expect(response.inventory).toHaveLength(1);
    expect(response.inventory[0]).toMatchObject({
      category: "Storage",
      inventoryId: "product_2",
    });
  });

  it("does not expose credentials, token material, or raw payloads", async () => {
    const { service } = createService({
      products: [
        {
          ...product("product_1", "Lighting"),
          sourceMetadata: {
            raw: {
              categories: [{ name: "Lighting" }],
              secret: "must-not-leak",
              token: "hidden",
            },
          },
        },
      ],
    });

    const response = await service.listInventory("user_1", {});
    const serialized = JSON.stringify(response).toLowerCase();

    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("token");
    expect(serialized).not.toContain("credential");
    expect(serialized).not.toContain("hash");
  });

  it("rejects users without a business profile", async () => {
    const { service } = createService({ businessRecord: null });

    await expect(service.listInventory("missing_user", {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

function createService(
  input: {
    readonly businessRecord?: { readonly id: string } | null;
    readonly orderItems?: readonly CommerceOrderItemTestRecord[];
    readonly products?: readonly CommerceProductTestRecord[];
    readonly snapshots?: readonly CommerceInventorySnapshotTestRecord[];
  } = {},
) {
  const prisma = {
    business: {
      findUnique: jest
        .fn()
        .mockResolvedValue(input.businessRecord === undefined ? business : input.businessRecord),
    },
    commerceInventorySnapshot: { findMany: jest.fn().mockResolvedValue(input.snapshots ?? []) },
    commerceOrderItem: {
      findMany: jest.fn().mockResolvedValue(
        (input.orderItems ?? []).map((item) => ({
          order: { orderStatus: "processing" },
          ...item,
        })),
      ),
    },
    commerceProduct: { findMany: jest.fn().mockResolvedValue(input.products ?? []) },
  };
  const prismaService = { client: prisma } as unknown as PrismaService;

  return { prisma, service: new CommerceInventoryService(prismaService) };
}

function product(id: string, category: string): CommerceProductTestRecord {
  return {
    connectedStore: { id: "store_1", storeName: "Main Store" },
    currency: "GBP",
    currentStockQuantity: 10,
    id,
    name: id,
    platform: StorePlatform.WooCommerce,
    platformProductId: id,
    priceAmount: "10.00",
    sku: id.toUpperCase(),
    sourceMetadata: { raw: { categories: [{ name: category }] } },
    stockStatus: "instock",
  };
}

interface CommerceProductTestRecord {
  readonly connectedStore: { readonly id: string; readonly storeName: string };
  readonly currency: string | null;
  readonly currentStockQuantity: number | null;
  readonly id: string;
  readonly name: string | null;
  readonly platform: StorePlatform;
  readonly platformProductId: string;
  readonly priceAmount: unknown;
  readonly sku: string | null;
  readonly sourceMetadata: unknown;
  readonly stockStatus: string | null;
}

interface CommerceOrderItemTestRecord {
  readonly connectedStoreId: string;
  readonly order?: { readonly orderStatus: string | null };
  readonly platform: StorePlatform;
  readonly platformProductId: string | null;
  readonly quantity: number | null;
}

interface CommerceInventorySnapshotTestRecord {
  readonly connectedStoreId: string;
  readonly capturedAt: Date;
  readonly platform: StorePlatform;
  readonly platformProductId: string;
  readonly stockQuantity: number | null;
}
