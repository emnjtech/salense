import { getDefaultApiBaseUrl, type StorePlatform } from "./store-integrations-client";
import { fetchWithSessionRefresh } from "../auth-session";

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

export interface CommerceProductDetailResponse {
  readonly product: CommerceProductDetail;
}

export interface CommerceProductDetail {
  readonly category: string | null;
  readonly currency: string | null;
  readonly currentStock: number | null;
  readonly importedAt: string | null;
  readonly insights: readonly CommerceProductInsight[];
  readonly lastSyncedAt: string | null;
  readonly platform: StorePlatform;
  readonly platformCreatedAt: string | null;
  readonly platformProductId: string;
  readonly platformUpdatedAt: string | null;
  readonly price: number | null;
  readonly productId: string;
  readonly productName: string | null;
  readonly productStatus: string | null;
  readonly productType: string | null;
  readonly recentSales: readonly CommerceProductRecentSale[];
  readonly regularPrice: number | null;
  readonly salePrice: number | null;
  readonly sales: CommerceProductSalesDetail;
  readonly sku: string | null;
  readonly stockStatus: string | null;
  readonly store: CommerceProductStoreDetail;
}

export interface CommerceProductStoreDetail {
  readonly connectedStoreId: string;
  readonly storeName: string;
  readonly storeUrl: string | null;
}

export interface CommerceProductSalesDetail {
  readonly averageOrderValue: number;
  readonly last30DaysRevenue: number;
  readonly last30DaysUnitsSold: number;
  readonly lastPurchaseDate: string | null;
  readonly salesRatePerDay: number;
  readonly totalOrders: number;
  readonly totalRevenue: number;
  readonly totalUnitsSold: number;
}

export interface CommerceProductRecentSale {
  readonly date: string | null;
  readonly orderNumber: string | null;
  readonly quantity: number;
  readonly revenue: number;
  readonly status: string | null;
}

export interface CommerceProductInsight {
  readonly severity: "INFO" | "SUCCESS" | "WARNING";
  readonly title: string;
  readonly message: string;
}

export interface CommerceProductFilters {
  readonly platform?: StorePlatform;
  readonly search?: string;
  readonly stockStatus?: string;
}

export interface ProductsApiClient {
  getProduct(
    accessToken: string,
    productId: string,
  ): Promise<CommerceProductDetailResponse>;
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
    async getProduct(accessToken, productId) {
      const normalizedProductId = decodeProductId(productId);
      const response = await fetchWithSessionRefresh(
        `${baseUrl}/commerce/products/${encodeURIComponent(normalizedProductId)}`,
        { headers: {} },
        { accessToken, baseUrl, fetchImpl },
      );

      if (!response.ok) {
        throw new ProductsClientError(await getErrorMessage(response), response.status);
      }

      return (await response.json()) as CommerceProductDetailResponse;
    },

    async listProducts(accessToken, filters = {}) {
      const response = await fetchWithSessionRefresh(
        `${baseUrl}/commerce/products${toQueryString(filters)}`,
        { headers: {} },
        { accessToken, baseUrl, fetchImpl },
      );

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
    return "We could not complete the request. Please try again.";
  }

  return "We could not complete the request. Please try again.";
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, "");
}

function decodeProductId(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
