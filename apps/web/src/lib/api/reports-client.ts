import { fetchWithSessionRefresh } from "../auth-session";
import { getDefaultApiBaseUrl, type StorePlatform } from "./store-integrations-client";

export interface ReportsOverviewFilters {
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly platform?: StorePlatform;
  readonly store?: string;
}

export interface ReportsOverviewResponse {
  readonly filters: {
    readonly dateFrom: string;
    readonly dateTo: string;
    readonly platform: StorePlatform | null;
    readonly store: string | null;
  };
  readonly kpis: {
    readonly averageOrderValue: number;
    readonly businessHealthScore: number;
    readonly orders: number;
    readonly refunds: number;
    readonly revenue: number;
  };
  readonly revenueTrend: readonly ReportsTrendPoint[];
  readonly ordersTrend: readonly ReportsTrendPoint[];
  readonly revenueByPlatform: readonly ReportsPlatformMetric[];
  readonly ordersByPlatform: readonly ReportsPlatformMetric[];
  readonly topProducts: readonly ReportsTopProduct[];
  readonly topCustomers: readonly ReportsTopCustomer[];
  readonly inventory: ReportsInventorySummary;
  readonly stores: readonly ReportsStoreFilterOption[];
}

export interface ReportsTrendPoint {
  readonly date: string;
  readonly value: number;
}

export interface ReportsPlatformMetric {
  readonly platform: StorePlatform;
  readonly value: number;
}

export interface ReportsTopProduct {
  readonly inventory: number | null;
  readonly platform: StorePlatform;
  readonly productId: string | null;
  readonly productName: string;
  readonly revenue: number;
  readonly sku: string | null;
  readonly unitsSold: number;
}

export interface ReportsTopCustomer {
  readonly averageOrderValue: number;
  readonly customerId: string | null;
  readonly customerName: string;
  readonly lifetimeSpend: number;
  readonly orders: number;
}

export interface ReportsInventorySummary {
  readonly inventoryRisk: number;
  readonly inventoryValue: number;
  readonly lowStock: number;
  readonly outOfStock: number;
}

export interface ReportsStoreFilterOption {
  readonly id: string;
  readonly platform: StorePlatform;
  readonly storeName: string;
}

export interface ReportsApiClient {
  getOverview(
    accessToken: string,
    filters?: ReportsOverviewFilters,
  ): Promise<ReportsOverviewResponse>;
}

export class ReportsClientError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ReportsClientError";
    this.status = status;
  }
}

interface ReportsApiClientOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

export function createReportsApiClient(options: ReportsApiClientOptions = {}): ReportsApiClient {
  const baseUrl = trimTrailingSlash(options.baseUrl ?? getDefaultApiBaseUrl());
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async getOverview(accessToken, filters = {}) {
      const response = await fetchWithSessionRefresh(
        `${baseUrl}/reports/overview${toQueryString(filters)}`,
        { headers: {} },
        { accessToken, baseUrl, fetchImpl },
      );

      if (!response.ok) {
        throw new ReportsClientError(await getErrorMessage(response), response.status);
      }

      return (await response.json()) as ReportsOverviewResponse;
    },
  };
}

function toQueryString(filters: ReportsOverviewFilters): string {
  const params = new URLSearchParams();

  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }

  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
  }

  if (filters.platform) {
    params.set("platform", filters.platform);
  }

  if (filters.store?.trim()) {
    params.set("store", filters.store.trim());
  }

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { readonly message?: unknown };

    if (typeof body.message === "string") {
      return body.message;
    }

    if (Array.isArray(body.message)) {
      return body.message.filter((message) => typeof message === "string").join(" ");
    }
  } catch {
    return `Request failed with status ${response.status}.`;
  }

  return `Request failed with status ${response.status}.`;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, "");
}
