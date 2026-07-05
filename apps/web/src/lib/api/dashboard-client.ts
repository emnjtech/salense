import { getDefaultApiBaseUrl, type StorePlatform } from "./store-integrations-client";
import { fetchWithSessionRefresh } from "../auth-session";

export interface PlatformMetric {
  readonly platform: StorePlatform;
  readonly value: number;
}

export interface TopProductToday {
  readonly name: string;
  readonly platform: StorePlatform;
  readonly quantitySold: number;
  readonly revenue: number;
  readonly sku: string | null;
}

export interface RuleBasedInsight {
  readonly message: string;
  readonly severity: "INFO" | "WARNING" | "SUCCESS";
  readonly type: "CONNECTION" | "INVENTORY" | "REVENUE" | "SALES";
}

export interface TodayDashboardResponse {
  readonly activeStores: number;
  readonly averageOrderValueToday: number;
  readonly basicBusinessHealthScore: number;
  readonly basicRuleBasedInsights: readonly RuleBasedInsight[];
  readonly bestPlatformToday: StorePlatform | null;
  readonly connectedPlatforms: readonly StorePlatform[];
  readonly lowStockCount: number;
  readonly ordersByPlatform: readonly PlatformMetric[];
  readonly ordersToday: number;
  readonly productsSoldToday: number;
  readonly refundCountToday: number;
  readonly revenueByPlatform: readonly PlatformMetric[];
  readonly revenueChangePercent: number | null;
  readonly todayRevenue: number;
  readonly topProductToday: TopProductToday | null;
  readonly yesterdayRevenue: number;
}

export interface DashboardApiClient {
  getTodayDashboard(accessToken: string): Promise<TodayDashboardResponse>;
}

export class DashboardClientError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DashboardClientError";
    this.status = status;
  }
}

interface DashboardApiClientOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

export function createDashboardApiClient(
  options: DashboardApiClientOptions = {},
): DashboardApiClient {
  const baseUrl = trimTrailingSlash(options.baseUrl ?? getDefaultApiBaseUrl());
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async getTodayDashboard(accessToken) {
      const response = await fetchWithSessionRefresh(
        `${baseUrl}/dashboard/today`,
        {
          headers: {},
        },
        {
          accessToken,
          baseUrl,
          fetchImpl,
        },
      );

      if (!response.ok) {
        throw new DashboardClientError(await getErrorMessage(response), response.status);
      }

      return (await response.json()) as TodayDashboardResponse;
    },
  };
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
