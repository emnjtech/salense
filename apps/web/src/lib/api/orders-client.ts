import { getDefaultApiBaseUrl, type StorePlatform } from "./store-integrations-client";
import { fetchWithSessionRefresh } from "../auth-session";

export interface CommerceOrderListItem {
  readonly currency: string | null;
  readonly customerEmail: string | null;
  readonly customerName: string | null;
  readonly itemCount: number;
  readonly orderDate: string | null;
  readonly orderId: string;
  readonly orderNumber: string;
  readonly platform: StorePlatform;
  readonly platformOrderId: string;
  readonly status: string | null;
  readonly storeName: string;
  readonly totalValue: number | null;
}

export interface CommerceOrderListResponse {
  readonly orders: readonly CommerceOrderListItem[];
}

export interface CommerceOrderFilters {
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly platform?: StorePlatform;
  readonly status?: string;
}

export interface OrdersApiClient {
  listOrders(
    accessToken: string,
    filters?: CommerceOrderFilters,
  ): Promise<CommerceOrderListResponse>;
}

export class OrdersClientError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OrdersClientError";
    this.status = status;
  }
}

interface OrdersApiClientOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

export function createOrdersApiClient(options: OrdersApiClientOptions = {}): OrdersApiClient {
  const baseUrl = trimTrailingSlash(options.baseUrl ?? getDefaultApiBaseUrl());
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async listOrders(accessToken, filters = {}) {
      const response = await fetchWithSessionRefresh(
        `${baseUrl}/commerce/orders${toQueryString(filters)}`,
        { headers: {} },
        { accessToken, baseUrl, fetchImpl },
      );

      if (!response.ok) {
        throw new OrdersClientError(await getErrorMessage(response), response.status);
      }

      return (await response.json()) as CommerceOrderListResponse;
    },
  };
}

function toQueryString(filters: CommerceOrderFilters): string {
  const params = new URLSearchParams();

  if (filters.platform) {
    params.set("platform", filters.platform);
  }

  if (filters.status?.trim()) {
    params.set("status", filters.status.trim());
  }

  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }

  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
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
