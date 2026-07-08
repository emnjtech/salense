import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { StoreConnectionStatus } from "../store-integrations/types/store-connection-status.enum.js";
import type { StorePlatform } from "../store-integrations/types/store-platform.enum.js";
import type { ListCommerceCustomersQueryDto } from "./dto/list-commerce-customers-query.dto.js";
import { isRevenueEligibleOrderStatus } from "./order-revenue.js";
import type {
  CommerceCustomerListItemResponse,
  CommerceCustomerListResponse,
  CommerceCustomersSummaryResponse,
} from "./types/commerce-customer-list-response.type.js";

interface CommerceCustomersPrismaClient {
  readonly business: {
    findUnique(args: {
      readonly where: { readonly ownerId: string };
      readonly select: { readonly id: true };
    }): Promise<{ readonly id: string } | null>;
  };
  readonly commerceCustomer: {
    findMany(args: {
      readonly where: CommerceCustomerWhereInput;
      readonly orderBy: readonly [{ readonly lastName: "asc" }, { readonly firstName: "asc" }];
      readonly take: number;
      readonly select: CommerceCustomerSelect;
    }): Promise<readonly CommerceCustomerRecord[]>;
  };
  readonly commerceOrder: {
    findMany(args: {
      readonly where: CommerceOrderWhereInput;
      readonly select: CommerceOrderSelect;
    }): Promise<readonly CommerceOrderRecord[]>;
  };
}

interface CommerceCustomerWhereInput {
  readonly businessId: string;
  readonly connectedStore: ActiveConnectedStoreWhereInput;
  readonly platform?: StorePlatform;
}

interface CommerceOrderWhereInput {
  readonly businessId: string;
  readonly connectedStore: ActiveConnectedStoreWhereInput;
  readonly platform?: StorePlatform;
}

interface ActiveConnectedStoreWhereInput {
  readonly connectionStatus: StoreConnectionStatus.Connected;
  readonly disconnectedAt: null;
}

interface CommerceCustomerSelect {
  readonly id: true;
  readonly connectedStoreId: true;
  readonly email: true;
  readonly firstName: true;
  readonly lastName: true;
  readonly platform: true;
  readonly platformCustomerId: true;
  readonly sourceMetadata: true;
  readonly username: true;
}

interface CommerceOrderSelect {
  readonly connectedStoreId: true;
  readonly id: true;
  readonly orderedAt: true;
  readonly orderStatus: true;
  readonly platform: true;
  readonly sourceMetadata: true;
  readonly totalAmount: true;
}

interface CommerceCustomerRecord {
  readonly id: string;
  readonly connectedStoreId: string;
  readonly email: string | null;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly platform: StorePlatform;
  readonly platformCustomerId: string;
  readonly sourceMetadata: unknown;
  readonly username: string | null;
}

interface CommerceOrderRecord {
  readonly connectedStoreId: string;
  readonly id: string;
  readonly orderedAt: Date | null;
  readonly orderStatus: string | null;
  readonly platform: StorePlatform;
  readonly sourceMetadata: unknown;
  readonly totalAmount: unknown;
}

interface CustomerOrderSummary {
  readonly lastPurchaseDate: Date | null;
  readonly lifetimeSpend: number;
  readonly revenueOrders: number;
  readonly totalOrders: number;
}

const customerSelect = {
  id: true,
  connectedStoreId: true,
  email: true,
  firstName: true,
  lastName: true,
  platform: true,
  platformCustomerId: true,
  sourceMetadata: true,
  username: true,
} as const;

const orderSelect = {
  connectedStoreId: true,
  id: true,
  orderedAt: true,
  orderStatus: true,
  platform: true,
  sourceMetadata: true,
  totalAmount: true,
} as const;

@Injectable()
export class CommerceCustomersService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async listCustomers(
    userId: string,
    query: ListCommerceCustomersQueryDto,
  ): Promise<CommerceCustomerListResponse> {
    const prisma = this.prismaService.client as unknown as CommerceCustomersPrismaClient;
    const business = await prisma.business.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!business) {
      throw new UnauthorizedException(
        "Company profile is required before viewing commerce customers.",
      );
    }

    const [customerRecords, orderRecords] = await Promise.all([
      prisma.commerceCustomer.findMany({
        where: buildCustomerWhere(business.id, query),
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        take: 250,
        select: customerSelect,
      }),
      prisma.commerceOrder.findMany({
        where: buildOrderWhere(business.id, query),
        select: orderSelect,
      }),
    ]);
    const ordersByCustomer = summarizeOrdersByCustomer(orderRecords);
    const customers = customerRecords
      .map((customer) => toCustomerListItem(customer, ordersByCustomer))
      .filter((customer) => matchesCustomerFilters(customer, query))
      .sort(sortCustomers);

    return {
      customers,
      summary: summarizeCustomers(customers),
    };
  }
}

function buildCustomerWhere(
  businessId: string,
  query: ListCommerceCustomersQueryDto,
): CommerceCustomerWhereInput {
  return {
    businessId,
    connectedStore: activeConnectedStoreWhere(),
    ...(query.platform ? { platform: query.platform } : {}),
  };
}

function buildOrderWhere(
  businessId: string,
  query: ListCommerceCustomersQueryDto,
): CommerceOrderWhereInput {
  return {
    businessId,
    connectedStore: activeConnectedStoreWhere(),
    ...(query.platform ? { platform: query.platform } : {}),
  };
}

function activeConnectedStoreWhere(): ActiveConnectedStoreWhereInput {
  return {
    connectionStatus: StoreConnectionStatus.Connected,
    disconnectedAt: null,
  };
}

function summarizeOrdersByCustomer(
  orders: readonly CommerceOrderRecord[],
): ReadonlyMap<string, CustomerOrderSummary> {
  const totals = new Map<string, CustomerOrderSummary>();
  const seenOrderIdsByCustomer = new Map<string, Set<string>>();

  orders.forEach((order) => {
    const email = extractOrderEmail(order.sourceMetadata);

    if (!email) {
      return;
    }

    const key = toCustomerEmailKey({
      connectedStoreId: order.connectedStoreId,
      email,
      platform: order.platform,
    });
    const seenOrderIds = seenOrderIdsByCustomer.get(key) ?? new Set<string>();

    if (seenOrderIds.has(order.id)) {
      return;
    }

    seenOrderIds.add(order.id);
    seenOrderIdsByCustomer.set(key, seenOrderIds);

    const current = totals.get(key) ?? {
      lastPurchaseDate: null,
      lifetimeSpend: 0,
      revenueOrders: 0,
      totalOrders: 0,
    };
    const revenueEligible = isRevenueEligibleOrderStatus(order.orderStatus);

    totals.set(key, {
      lastPurchaseDate: getLatestDate(current.lastPurchaseDate, order.orderedAt),
      lifetimeSpend: roundMoney(
        current.lifetimeSpend + (revenueEligible ? (toNumberOrNull(order.totalAmount) ?? 0) : 0),
      ),
      revenueOrders: current.revenueOrders + (revenueEligible ? 1 : 0),
      totalOrders: current.totalOrders + 1,
    });
  });

  return totals;
}

function toCustomerListItem(
  customer: CommerceCustomerRecord,
  ordersByCustomer: ReadonlyMap<string, CustomerOrderSummary>,
): CommerceCustomerListItemResponse {
  const location = extractLocation(customer.sourceMetadata);
  const summary =
    customer.email === null
      ? null
      : ordersByCustomer.get(
          toCustomerEmailKey({
            connectedStoreId: customer.connectedStoreId,
            email: customer.email,
            platform: customer.platform,
          }),
        );
  const totalOrders = summary?.totalOrders ?? 0;
  const lifetimeSpend = summary?.lifetimeSpend ?? 0;
  const revenueOrders = summary?.revenueOrders ?? 0;

  return {
    averageOrderValue: revenueOrders > 0 ? roundMoney(lifetimeSpend / revenueOrders) : 0,
    city: location.city,
    country: location.country,
    customerEmail: customer.email,
    customerId: customer.id,
    customerName: formatCustomerName(customer),
    lastPurchaseDate: summary?.lastPurchaseDate?.toISOString() ?? null,
    lifetimeSpend,
    platform: customer.platform,
    totalOrders,
  };
}

function matchesCustomerFilters(
  customer: CommerceCustomerListItemResponse,
  query: ListCommerceCustomersQueryDto,
): boolean {
  const countryFilter = query.country?.trim().toLowerCase();
  const searchFilter = query.search?.trim().toLowerCase();

  if (countryFilter && customer.country?.toLowerCase() !== countryFilter) {
    return false;
  }

  if (!searchFilter) {
    return true;
  }

  return [customer.customerName, customer.customerEmail, customer.country, customer.city]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(searchFilter));
}

function summarizeCustomers(
  customers: readonly CommerceCustomerListItemResponse[],
): CommerceCustomersSummaryResponse {
  const purchasingCustomers = customers.filter((customer) => customer.totalOrders > 0);
  const highestLifetimeCustomer =
    [...customers].sort((left, right) => {
      if (right.lifetimeSpend !== left.lifetimeSpend) {
        return right.lifetimeSpend - left.lifetimeSpend;
      }

      return right.totalOrders - left.totalOrders;
    })[0] ?? null;

  return {
    highestLifetimeCustomer:
      highestLifetimeCustomer && highestLifetimeCustomer.lifetimeSpend > 0
        ? {
            customerId: highestLifetimeCustomer.customerId,
            customerName: highestLifetimeCustomer.customerName,
            lifetimeSpend: highestLifetimeCustomer.lifetimeSpend,
          }
        : null,
    newCustomers: purchasingCustomers.filter((customer) => customer.totalOrders === 1).length,
    returningCustomers: purchasingCustomers.filter((customer) => customer.totalOrders > 1).length,
  };
}

function sortCustomers(
  left: CommerceCustomerListItemResponse,
  right: CommerceCustomerListItemResponse,
): number {
  if (right.lifetimeSpend !== left.lifetimeSpend) {
    return right.lifetimeSpend - left.lifetimeSpend;
  }

  return (left.customerName ?? left.customerEmail ?? left.customerId).localeCompare(
    right.customerName ?? right.customerEmail ?? right.customerId,
  );
}

function formatCustomerName(customer: CommerceCustomerRecord): string | null {
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim();

  return name || customer.username || null;
}

function extractOrderEmail(sourceMetadata: unknown): string | null {
  const raw = getRecord(getRecord(sourceMetadata)?.raw);
  const billing = getRecord(raw?.billing);
  const shipping = getRecord(raw?.shipping);

  return (
    (
      getString(billing?.email) ??
      getString(shipping?.email) ??
      getString(raw?.billing_email) ??
      getString(raw?.customer_email)
    )?.toLowerCase() ?? null
  );
}

function extractLocation(sourceMetadata: unknown): {
  readonly city: string | null;
  readonly country: string | null;
} {
  const raw = getRecord(getRecord(sourceMetadata)?.raw);
  const billing = getRecord(raw?.billing);
  const shipping = getRecord(raw?.shipping);

  return {
    city:
      getString(billing?.city) ??
      getString(shipping?.city) ??
      getString(raw?.city) ??
      getString(raw?.customerCity),
    country:
      getString(billing?.country) ??
      getString(shipping?.country) ??
      getString(raw?.country) ??
      getString(raw?.customerCountry),
  };
}

function toCustomerEmailKey(input: {
  readonly connectedStoreId: string;
  readonly email: string;
  readonly platform: StorePlatform;
}): string {
  return `${input.connectedStoreId}:${input.platform}:${input.email.trim().toLowerCase()}`;
}

function getLatestDate(left: Date | null, right: Date | null): Date | null {
  if (!right) {
    return left;
  }

  if (!left || right > left) {
    return right;
  }

  return left;
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
