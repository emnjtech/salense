import { getDefaultApiBaseUrl, type StorePlatform } from "./store-integrations-client";

export interface CommerceProductListItem {
  readonly category: string | null;
  readonly currency: string | null;
  readonly currentStock: number | null;
  readonly platform: StorePlatform;
  readonly platformProductId: string;
  readonly price: number | null;
  readonly productId: string;
  readonly productName: string | null;
  readonly revenue: number;
  readonly sku: string | null;
  readonly stockStatus: string | null;
  readonly storeName: string;
  readonly unitsSold: number;
}

export interface CommerceProductListResponse {
  readonly products: readonly CommerceProductListItem[];
}

export interface CommerceProductFilters {
  readonly platform?: StorePlatform;
  readonly search?: string;
  readonly stockStatus?: string;
}

export interface ProductsApiClient {
  listProducts(
    accessToken: string,
    filters?: CommerceProductFilters,
  ): Promise<CommerceProductListResponse>;
}

export class ProductsClientError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ProductsClientError";
    this.status = status;
  }
}

interface ProductsApiClientOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

export function createProductsApiClient(options: ProductsApiClientOptions = {}): ProductsApiClient {
  const baseUrl = trimTrailingSlash(options.baseUrl ?? getDefaultApiBaseUrl());
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async listProducts(accessToken, filters = {}) {
      const response = await fetchImpl(`${baseUrl}/commerce/products${toQueryString(filters)}`, {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new ProductsClientError(await getErrorMessage(response), response.status);
      }

      return (await response.json()) as CommerceProductListResponse;
    },
  };
}

function toQueryString(filters: CommerceProductFilters): string {
  const params = new URLSearchParams();

  if (filters.platform) {
    params.set("platform", filters.platform);
  }

  if (filters.stockStatus?.trim()) {
    params.set("stockStatus", filters.stockStatus.trim());
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
