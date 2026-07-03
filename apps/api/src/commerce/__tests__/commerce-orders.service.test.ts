import { UnauthorizedException } from "@nestjs/common";
import type { PrismaService } from "../../database/prisma.service.js";
import { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";
import { CommerceOrdersService } from "../commerce-orders.service.js";

const business = { id: "business_1" } as const;

describe("CommerceOrdersService", () => {
  it("returns safe unified order list fields", async () => {
    const { service } = createService({
      orders: [
        {
          _count: { items: 3 },
          connectedStore: { storeName: "Main Store" },
          currency: "GBP",
          id: "order_db_1",
          orderStatus: "processing",
          orderedAt: new Date("2026-07-03T10:15:00.000Z"),
          platform: StorePlatform.WooCommerce,
          platformOrderId: "1001",
          platformOrderNumber: "#1001",
          sourceMetadata: {
            raw: {
              billing: {
                email: "buyer@example.com",
                first_name: "Ada",
                last_name: "Lovelace",
              },
            },
          },
          totalAmount: "129.95",
        },
      ],
    });

    await expect(service.listOrders("user_1", {})).resolves.toEqual({
      orders: [
        {
          currency: "GBP",
          customerEmail: "buyer@example.com",
          customerName: "Ada Lovelace",
          itemCount: 3,
          orderDate: "2026-07-03T10:15:00.000Z",
          orderId: "order_db_1",
          orderNumber: "#1001",
          platform: StorePlatform.WooCommerce,
          platformOrderId: "1001",
          status: "processing",
          storeName: "Main Store",
          totalValue: 129.95,
        },
      ],
    });
  });

  it("applies platform, status, and date filters within the user's business", async () => {
    const { prisma, service } = createService();

    await service.listOrders("user_1", {
      dateFrom: "2026-07-01T00:00:00.000Z",
      dateTo: "2026-07-03T23:59:59.000Z",
      platform: StorePlatform.AmazonSeller,
      status: "shipped",
    });

    expect(prisma.commerceOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          businessId: business.id,
          orderedAt: {
            gte: new Date("2026-07-01T00:00:00.000Z"),
            lte: new Date("2026-07-03T23:59:59.000Z"),
          },
          orderStatus: "shipped",
          platform: StorePlatform.AmazonSeller,
        },
      }),
    );
  });

  it("rejects users without a business profile", async () => {
    const { service } = createService({ businessRecord: null });

    await expect(service.listOrders("missing_user", {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("does not expose credentials, token material, or raw payloads", async () => {
    const { service } = createService({
      orders: [
        {
          _count: { items: 1 },
          connectedStore: { storeName: "Safe Store" },
          currency: "GBP",
          id: "order_db_1",
          orderStatus: "completed",
          orderedAt: null,
          platform: StorePlatform.TikTokShop,
          platformOrderId: "tt_1",
          platformOrderNumber: null,
          sourceMetadata: { raw: { secret: "must-not-leak", token: "hidden" } },
          totalAmount: null,
        },
      ],
    });

    const response = await service.listOrders("user_1", {});
    const serialized = JSON.stringify(response).toLowerCase();

    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("token");
    expect(serialized).not.toContain("credential");
    expect(serialized).not.toContain("hash");
    expect(response.orders[0]).toMatchObject({
      customerEmail: null,
      customerName: null,
      orderNumber: "tt_1",
      totalValue: null,
    });
  });
});

function createService(
  input: {
    readonly businessRecord?: { readonly id: string } | null;
    readonly orders?: readonly CommerceOrderTestRecord[];
  } = {},
) {
  const prisma = {
    business: {
      findUnique: jest
        .fn()
        .mockResolvedValue(input.businessRecord === undefined ? business : input.businessRecord),
    },
    commerceOrder: {
      findMany: jest.fn().mockResolvedValue(input.orders ?? []),
    },
  };
  const prismaService = { client: prisma } as unknown as PrismaService;

  return { prisma, service: new CommerceOrdersService(prismaService) };
}

interface CommerceOrderTestRecord {
  readonly _count: { readonly items: number };
  readonly connectedStore: { readonly storeName: string };
  readonly currency: string | null;
  readonly id: string;
  readonly orderStatus: string | null;
  readonly orderedAt: Date | null;
  readonly platform: StorePlatform;
  readonly platformOrderId: string;
  readonly platformOrderNumber: string | null;
  readonly sourceMetadata: unknown;
  readonly totalAmount: unknown;
}
