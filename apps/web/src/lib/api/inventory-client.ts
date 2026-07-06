import { getDefaultApiBaseUrl, type StorePlatform } from "./store-integrations-client";
import { fetchWithSessionRefresh } from "../auth-session";

export interface CommerceInventoryListItem {
  readonly averageDailySales: number;
  readonly category: string | null;
  readonly currentStock: number | null;
  readonly estimatedDaysRemaining: number | null;
  readonly inventoryId: string;
  readonly inventoryValue: number;
  readonly platform: StorePlatform;
  readonly productName: string | null;
  readonly reorderLevel: number;
  readonly sku: string | null;
  readonly stockStatus: string | null;
  readonly storeName: string;
}

export interface CommerceInventoryInsight {
  readonly message: string;
  readonly severity: "INFO" | "SUCCESS" | "WARNING";
  readonly type: "INVENTORY_VALUE" | "LOW_STOCK" | "NO_RECENT_SALES" | "STOCKOUT_RISK";
}

export interface CommerceInventorySummary {
  readonly inventoryValue: number;
  readonly lowStockProducts: number;
  readonly outOfStockProducts: number;
}

export interface CommerceInventoryListResponse {
  readonly insights: readonly CommerceInventoryInsight[];
  readonly inventory: readonly CommerceInventoryListItem[];
  readonly summary: CommerceInventorySummary;
}

export interface CommerceInventoryFilters {
  readonly category?: string;
  readonly platform?: StorePlatform;
  readonly search?: string;
  readonly stockStatus?: string;
}

export interface InventoryApiClient {
  listInventory(
    accessToken: string,
    filters?: CommerceInventoryFilters,
  ): Promise<CommerceInventoryListResponse>;
}

export class InventoryClientError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "InventoryClientError";
    this.status = status;
  }
}

interface InventoryApiClientOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

export function createInventoryApiClient(
  options: InventoryApiClientOptions = {},
): InventoryApiClient {
  const baseUrl = trimTrailingSlash(options.baseUrl ?? getDefaultApiBaseUrl());
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async listInventory(accessToken, filters = {}) {
      const response = await fetchWithSessionRefresh(
        `${baseUrl}/commerce/inventory${toQueryString(filters)}`,
        { headers: {} },
        { accessToken, baseUrl, fetchImpl },
      );

      if (!response.ok) {
        throw new InventoryClientError(await getErrorMessage(response), response.status);
      }

      return (await response.json()) as CommerceInventoryListResponse;
    },
  };
}

function toQueryString(filters: CommerceInventoryFilters): string {
  const params = new URLSearchParams();

  if (filters.platform) {
    params.set("platform", filters.platform);
  }

  if (filters.stockStatus?.trim()) {
    params.set("stockStatus", filters.stockStatus.trim());
  }

  if (filters.category?.trim()) {
    params.set("category", filters.category.trim());
  }

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
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
    return "We could not complete the request. Please try again.";
  }

  return "We could not complete the request. Please try again.";
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, "");
}
