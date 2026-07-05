import { getDefaultApiBaseUrl, type StorePlatform } from "./store-integrations-client";
import { fetchWithSessionRefresh } from "../auth-session";

export interface CommerceCustomerListItem {
  readonly averageOrderValue: number;
  readonly city: string | null;
  readonly country: string | null;
  readonly customerEmail: string | null;
  readonly customerId: string;
  readonly customerName: string | null;
  readonly lastPurchaseDate: string | null;
  readonly lifetimeSpend: number;
  readonly platform: StorePlatform;
  readonly totalOrders: number;
}

export interface CommerceCustomersSummary {
  readonly highestLifetimeCustomer: {
    readonly customerId: string;
    readonly customerName: string | null;
    readonly lifetimeSpend: number;
  } | null;
  readonly newCustomers: number;
  readonly returningCustomers: number;
}

export interface CommerceCustomerListResponse {
  readonly customers: readonly CommerceCustomerListItem[];
  readonly summary: CommerceCustomersSummary;
}

export interface CommerceCustomerFilters {
  readonly country?: string;
  readonly platform?: StorePlatform;
  readonly search?: string;
}

export interface CustomersApiClient {
  listCustomers(
    accessToken: string,
    filters?: CommerceCustomerFilters,
  ): Promise<CommerceCustomerListResponse>;
}

export class CustomersClientError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CustomersClientError";
    this.status = status;
  }
}

interface CustomersApiClientOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

export function createCustomersApiClient(
  options: CustomersApiClientOptions = {},
): CustomersApiClient {
  const baseUrl = trimTrailingSlash(options.baseUrl ?? getDefaultApiBaseUrl());
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async listCustomers(accessToken, filters = {}) {
      const response = await fetchWithSessionRefresh(
        `${baseUrl}/commerce/customers${toQueryString(filters)}`,
        { headers: {} },
        { accessToken, baseUrl, fetchImpl },
      );

      if (!response.ok) {
        throw new CustomersClientError(await getErrorMessage(response), response.status);
      }

      return (await response.json()) as CommerceCustomerListResponse;
    },
  };
}

function toQueryString(filters: CommerceCustomerFilters): string {
  const params = new URLSearchParams();

  if (filters.platform) {
    params.set("platform", filters.platform);
  }

  if (filters.country?.trim()) {
    params.set("country", filters.country.trim());
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
    return `Request failed with status ${response.status}.`;
  }

  return `Request failed with status ${response.status}.`;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, "");
}
