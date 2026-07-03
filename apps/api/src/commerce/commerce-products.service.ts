import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import type { StorePlatform } from "../store-integrations/types/store-platform.enum.js";
import type { ListCommerceProductsQueryDto } from "./dto/list-commerce-products-query.dto.js";
import type {
  CommerceProductListItemResponse,
  CommerceProductListResponse,
} from "./types/commerce-product-list-response.type.js";

interface CommerceProductsPrismaClient {
  readonly business: {
    findUnique(args: {
      readonly where: { readonly ownerId: string };
      readonly select: { readonly id: true };
    }): Promise<{ readonly id: string } | null>;
  };
  readonly commerceProduct: {
    findMany(args: {
      readonly where: CommerceProductWhereInput;
      readonly orderBy: { readonly name: "asc" };
      readonly take: number;
      readonly select: CommerceProductSelect;
    }): Promise<readonly CommerceProductRecord[]>;
  };
  readonly commerceOrderItem: {
    findMany(args: {
      readonly where: CommerceOrderItemWhereInput;
      readonly select: CommerceOrderItemSelect;
    }): Promise<readonly CommerceOrderItemRecord[]>;
  };
}

interface CommerceProductWhereInput {
  readonly businessId: string;
  readonly platform?: StorePlatform;
  readonly stockStatus?: string;
  readonly OR?: readonly {
    readonly name?: { readonly contains: string; readonly mode: "insensitive" };
    readonly sku?: { readonly contains: string; readonly mode: "insensitive" };
    readonly platformProductId?: { readonly contains: string; readonly mode: "insensitive" };
  }[];
}

interface CommerceOrderItemWhereInput {
  readonly businessId: string;
  readonly platformProductId: { readonly in: readonly string[] };
}

interface CommerceProductSelect {
  readonly id: true;
  readonly platform: true;
  readonly platformProductId: true;
  readonly sku: true;
  readonly name: true;
  readonly currency: true;
  readonly priceAmount: true;
  readonly stockStatus: true;
  readonly currentStockQuantity: true;
  readonly sourceMetadata: true;
  readonly connectedStore: { readonly select: { readonly id: true; readonly storeName: true } };
}

interface CommerceOrderItemSelect {
  readonly connectedStoreId: true;
  readonly platform: true;
  readonly platformProductId: true;
  readonly quantity: true;
  readonly totalAmount: true;
}

interface CommerceProductRecord {
  readonly id: string;
  readonly platform: StorePlatform;
  readonly platformProductId: string;
  readonly sku: string | null;
  readonly name: string | null;
  readonly currency: string | null;
  readonly priceAmount: unknown;
  readonly stockStatus: string | null;
  readonly currentStockQuantity: number | null;
  readonly sourceMetadata: unknown;
  readonly connectedStore: { readonly id: string; readonly storeName: string };
}

interface CommerceOrderItemRecord {
  readonly connectedStoreId: string;
  readonly platform: StorePlatform;
  readonly platformProductId: string | null;
  readonly quantity: number | null;
  readonly totalAmount: unknown;
}

interface ProductSalesSummary {
  readonly revenue: number;
  readonly unitsSold: number;
}

const productSelect = {
  id: true,
  platform: true,
  platformProductId: true,
  sku: true,
  name: true,
  currency: true,
  priceAmount: true,
  stockStatus: true,
  currentStockQuantity: true,
  sourceMetadata: true,
  connectedStore: { select: { id: true, storeName: true } },
} as const;

@Injectable()
export class CommerceProductsService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async listProducts(
    userId: string,
    query: ListCommerceProductsQueryDto,
  ): Promise<CommerceProductListResponse> {
    const prisma = this.prismaService.client as unknown as CommerceProductsPrismaClient;
    const business = await prisma.business.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!business) {
      throw new UnauthorizedException(
        "Company profile is required before viewing commerce products.",
      );
    }

    const products = await prisma.commerceProduct.findMany({
      where: buildProductWhere(business.id, query),
      orderBy: { name: "asc" },
      take: 100,
      select: productSelect,
    });
    const productIds = [...new Set(products.map((product) => product.platformProductId))];
    const orderItems =
      productIds.length > 0
        ? await prisma.commerceOrderItem.findMany({
            where: { businessId: business.id, platformProductId: { in: productIds } },
            select: {
              connectedStoreId: true,
              platform: true,
              platformProductId: true,
              quantity: true,
              totalAmount: true,
            },
          })
        : [];
    const salesByProduct = summarizeSales(orderItems);

    return {
      products: products.map((product) => toProductListItem(product, salesByProduct)),
    };
  }
}

function buildProductWhere(
  businessId: string,
  query: ListCommerceProductsQueryDto,
): CommerceProductWhereInput {
  return {
    businessId,
    ...(query.platform ? { platform: query.platform } : {}),
    ...(query.stockStatus ? { stockStatus: query.stockStatus } : {}),
    ...(query.search?.trim()
      ? {
          OR: [
            { name: { contains: query.search.trim(), mode: "insensitive" } },
            { sku: { contains: query.search.trim(), mode: "insensitive" } },
            { platformProductId: { contains: query.search.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function toProductListItem(
  product: CommerceProductRecord,
  salesByProduct: ReadonlyMap<string, ProductSalesSummary>,
): CommerceProductListItemResponse {
  const sales = salesByProduct.get(toProductSalesKey(product)) ?? { revenue: 0, unitsSold: 0 };

  return {
    category: extractCategory(product.sourceMetadata),
    currency: product.currency,
    currentStock: product.currentStockQuantity,
    platform: product.platform,
    platformProductId: product.platformProductId,
    price: toNumberOrNull(product.priceAmount),
    productId: product.id,
    productName: product.name,
    revenue: sales.revenue,
    sku: product.sku,
    stockStatus: product.stockStatus,
    storeName: product.connectedStore.storeName,
    unitsSold: sales.unitsSold,
  };
}

function summarizeSales(
  orderItems: readonly CommerceOrderItemRecord[],
): ReadonlyMap<string, ProductSalesSummary> {
  const totals = new Map<string, ProductSalesSummary>();

  orderItems.forEach((item) => {
    if (!item.platformProductId) {
      return;
    }

    const key = toSalesKey({
      connectedStoreId: item.connectedStoreId,
      platform: item.platform,
      platformProductId: item.platformProductId,
    });
    const current = totals.get(key) ?? { revenue: 0, unitsSold: 0 };

    totals.set(key, {
      revenue: roundMoney(current.revenue + (toNumberOrNull(item.totalAmount) ?? 0)),
      unitsSold: current.unitsSold + Math.max(item.quantity ?? 0, 0),
    });
  });

  return totals;
}

function toProductSalesKey(product: CommerceProductRecord): string {
  return toSalesKey({
    connectedStoreId: product.connectedStore.id,
    platform: product.platform,
    platformProductId: product.platformProductId,
  });
}

function toSalesKey(input: {
  readonly connectedStoreId: string;
  readonly platform: StorePlatform;
  readonly platformProductId: string;
}): string {
  return `${input.connectedStoreId}:${input.platform}:${input.platformProductId}`;
}

function extractCategory(sourceMetadata: unknown): string | null {
  const raw = getRecord(getRecord(sourceMetadata)?.raw);
  const categories = raw?.categories;

  if (!Array.isArray(categories)) {
    return null;
  }

  const firstCategory = categories.map(getRecord).find((category) => getString(category?.name));

  return getString(firstCategory?.name);
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? roundMoney(numericValue) : null;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
