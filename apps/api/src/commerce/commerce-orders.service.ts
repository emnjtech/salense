import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import type { StorePlatform } from "../store-integrations/types/store-platform.enum.js";
import type { ListCommerceOrdersQueryDto } from "./dto/list-commerce-orders-query.dto.js";
import type {
  CommerceOrderListItemResponse,
  CommerceOrderListResponse,
} from "./types/commerce-order-list-response.type.js";

interface CommerceOrdersPrismaClient {
  readonly business: {
    findUnique(args: {
      readonly where: { readonly ownerId: string };
      readonly select: { readonly id: true };
    }): Promise<{ readonly id: string } | null>;
  };
  readonly commerceOrder: {
    findMany(args: {
      readonly where: CommerceOrderWhereInput;
      readonly orderBy: { readonly orderedAt: "desc" };
      readonly take: number;
      readonly select: CommerceOrderSelect;
    }): Promise<readonly CommerceOrderRecord[]>;
  };
}

interface CommerceOrderWhereInput {
  readonly businessId: string;
  readonly platform?: StorePlatform;
  readonly orderStatus?: string;
  readonly orderedAt?: {
    readonly gte?: Date;
    readonly lte?: Date;
  };
}

interface CommerceOrderSelect {
  readonly id: true;
  readonly platform: true;
  readonly platformOrderId: true;
  readonly platformOrderNumber: true;
  readonly orderStatus: true;
  readonly currency: true;
  readonly totalAmount: true;
  readonly orderedAt: true;
  readonly sourceMetadata: true;
  readonly connectedStore: { readonly select: { readonly storeName: true } };
  readonly _count: { readonly select: { readonly items: true } };
}

interface CommerceOrderRecord {
  readonly id: string;
  readonly platform: StorePlatform;
  readonly platformOrderId: string;
  readonly platformOrderNumber: string | null;
  readonly orderStatus: string | null;
  readonly currency: string | null;
  readonly totalAmount: unknown;
  readonly orderedAt: Date | null;
  readonly sourceMetadata: unknown;
  readonly connectedStore: { readonly storeName: string };
  readonly _count: { readonly items: number };
}

interface CustomerMetadata {
  readonly email: string | null;
  readonly name: string | null;
}

const orderSelect = {
  id: true,
  platform: true,
  platformOrderId: true,
  platformOrderNumber: true,
  orderStatus: true,
  currency: true,
  totalAmount: true,
  orderedAt: true,
  sourceMetadata: true,
  connectedStore: { select: { storeName: true } },
  _count: { select: { items: true } },
} as const;

@Injectable()
export class CommerceOrdersService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async listOrders(
    userId: string,
    query: ListCommerceOrdersQueryDto,
  ): Promise<CommerceOrderListResponse> {
    const prisma = this.prismaService.client as unknown as CommerceOrdersPrismaClient;
    const business = await prisma.business.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!business) {
      throw new UnauthorizedException(
        "Company profile is required before viewing commerce orders.",
      );
    }

    const orders = await prisma.commerceOrder.findMany({
      where: buildOrderWhere(business.id, query),
      orderBy: { orderedAt: "desc" },
      take: 100,
      select: orderSelect,
    });

    return { orders: orders.map(toOrderListItem) };
  }
}

function buildOrderWhere(
  businessId: string,
  query: ListCommerceOrdersQueryDto,
): CommerceOrderWhereInput {
  return {
    businessId,
    ...(query.platform ? { platform: query.platform } : {}),
    ...(query.status ? { orderStatus: query.status } : {}),
    ...(query.dateFrom || query.dateTo
      ? {
          orderedAt: {
            ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
            ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
          },
        }
      : {}),
  };
}

function toOrderListItem(order: CommerceOrderRecord): CommerceOrderListItemResponse {
  const customer = extractCustomerMetadata(order.sourceMetadata);

  return {
    currency: order.currency,
    customerEmail: customer.email,
    customerName: customer.name,
    itemCount: order._count.items,
    orderDate: order.orderedAt?.toISOString() ?? null,
    orderId: order.id,
    orderNumber: order.platformOrderNumber ?? order.platformOrderId,
    platform: order.platform,
    platformOrderId: order.platformOrderId,
    status: order.orderStatus,
    storeName: order.connectedStore.storeName,
    totalValue: toNumberOrNull(order.totalAmount),
  };
}

function extractCustomerMetadata(sourceMetadata: unknown): CustomerMetadata {
  const raw = getRecord(getRecord(sourceMetadata)?.raw);
  const billing = getRecord(raw?.billing);
  const shipping = getRecord(raw?.shipping);
  const firstName = getString(billing?.first_name) ?? getString(shipping?.first_name);
  const lastName = getString(billing?.last_name) ?? getString(shipping?.last_name);
  const email = getString(billing?.email) ?? getString(raw?.billing_email) ?? null;
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();

  return { email, name: name.length > 0 ? name : null };
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

  return Number.isFinite(numericValue) ? Math.round(numericValue * 100) / 100 : null;
}
