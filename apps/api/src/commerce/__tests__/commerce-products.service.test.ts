import { UnauthorizedException } from "@nestjs/common";
import type { PrismaService } from "../../database/prisma.service.js";
import { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";
import { CommerceProductsService } from "../commerce-products.service.js";

const business = { id: "business_1" } as const;

describe("CommerceProductsService", () => {
  it("returns safe unified product list fields with sales totals", async () => {
    const { service } = createService({
      orderItems: [
        {
          connectedStoreId: "store_1",
          platform: StorePlatform.WooCommerce,
          platformProductId: "woo_10",
          quantity: 2,
          totalAmount: "70.50",
        },
        {
          connectedStoreId: "store_1",
          platform: StorePlatform.WooCommerce,
          platformProductId: "woo_10",
          quantity: 1,
          totalAmount: "35.25",
        },
      ],
      products: [
        {
          connectedStore: { id: "store_1", storeName: "Main Store" },
          currency: "GBP",
          currentStockQuantity: 14,
          id: "product_db_1",
          name: "Trail Shoe",
          platform: StorePlatform.WooCommerce,
          platformProductId: "woo_10",
          priceAmount: "35.25",
          sku: "SHOE-TRAIL",
          sourceMetadata: { raw: { categories: [{ name: "Shoes" }] } },
          stockStatus: "instock",
        },
      ],
    });

    await expect(service.listProducts("user_1", {})).resolves.toEqual({
      products: [
        {
          category: "Shoes",
          currency: "GBP",
          currentStock: 14,
          platform: StorePlatform.WooCommerce,
          platformProductId: "woo_10",
          price: 35.25,
          productId: "product_db_1",
          productName: "Trail Shoe",
          revenue: 105.75,
          sku: "SHOE-TRAIL",
          stockStatus: "instock",
          storeName: "Main Store",
          unitsSold: 3,
        },
      ],
    });
  });

  it("applies platform, stock status, and search filters within the user's business", async () => {
    const { prisma, service } = createService();

    await service.listProducts("user_1", {
      platform: StorePlatform.AmazonSeller,
      search: "wax",
      stockStatus: "lowstock",
    });

    expect(prisma.commerceProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: "wax", mode: "insensitive" } },
            { sku: { contains: "wax", mode: "insensitive" } },
            { platformProductId: { contains: "wax", mode: "insensitive" } },
          ],
          businessId: business.id,
          platform: StorePlatform.AmazonSeller,
          stockStatus: "lowstock",
        },
      }),
    );
  });

  it("does not merge products across stores or platforms", async () => {
    const { service } = createService({
      orderItems: [
        {
          connectedStoreId: "store_1",
          platform: StorePlatform.WooCommerce,
          platformProductId: "shared_id",
          quantity: 2,
          totalAmount: 50,
        },
        {
          connectedStoreId: "store_2",
          platform: StorePlatform.AmazonSeller,
          platformProductId: "shared_id",
          quantity: 8,
          totalAmount: 400,
        },
      ],
      products: [
        {
          connectedStore: { id: "store_1", storeName: "Woo Store" },
          currency: "GBP",
          currentStockQuantity: null,
          id: "woo_product",
          name: "Shared Product",
          platform: StorePlatform.WooCommerce,
          platformProductId: "shared_id",
          priceAmount: null,
          sku: null,
          sourceMetadata: null,
          stockStatus: null,
        },
      ],
    });

    const response = await service.listProducts("user_1", {});

    expect(response.products[0]).toMatchObject({ revenue: 50, unitsSold: 2 });
  });

  it("rejects users without a business profile", async () => {
    const { service } = createService({ businessRecord: null });

    await expect(service.listProducts("missing_user", {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("does not expose credentials, token material, or raw payloads", async () => {
    const { service } = createService({
      products: [
        {
          connectedStore: { id: "store_1", storeName: "Safe Store" },
          currency: "GBP",
          currentStockQuantity: 1,
          id: "product_db_1",
          name: "Safe Product",
          platform: StorePlatform.TikTokShop,
          platformProductId: "tt_1",
          priceAmount: "10",
          sku: "SAFE",
          sourceMetadata: { raw: { secret: "must-not-leak", token: "hidden" } },
          stockStatus: "instock",
        },
      ],
    });

    const response = await service.listProducts("user_1", {});
    const serialized = JSON.stringify(response).toLowerCase();

    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("token");
    expect(serialized).not.toContain("credential");
    expect(serialized).not.toContain("hash");
  });
});

function createService(
  input: {
    readonly businessRecord?: { readonly id: string } | null;
    readonly orderItems?: readonly CommerceOrderItemTestRecord[];
    readonly products?: readonly CommerceProductTestRecord[];
  } = {},
) {
  const prisma = {
    business: {
      findUnique: jest
        .fn()
        .mockResolvedValue(input.businessRecord === undefined ? business : input.businessRecord),
    },
    commerceOrderItem: { findMany: jest.fn().mockResolvedValue(input.orderItems ?? []) },
    commerceProduct: { findMany: jest.fn().mockResolvedValue(input.products ?? []) },
  };
  const prismaService = { client: prisma } as unknown as PrismaService;

  return { prisma, service: new CommerceProductsService(prismaService) };
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
  readonly platform: StorePlatform;
  readonly platformProductId: string | null;
  readonly quantity: number | null;
  readonly totalAmount: unknown;
}
