import {
  IntegrationAuthenticationError,
  IntegrationConnectionError,
} from "../../errors/integration-error.js";
import { ConnectionHealthStatus, type ConnectionHealth } from "../../types/connection-health.js";
import { IntegrationPlatform } from "../../types/integration-platform.js";
import type { WooCommerceApiVersion } from "./woocommerce-configuration.js";
import type {
  WooCommerceRawCustomer,
  WooCommerceRawInventoryProduct,
  WooCommerceRawOrder,
  WooCommerceRawProduct,
  WooCommerceRawProductCategory,
  WooCommerceRawRefund,
} from "./woocommerce-raw-models.js";

export interface WooCommerceConnectionValidationRequest {
  readonly storeUrl: string;
  readonly consumerKey: string;
  readonly consumerSecret: string;
  readonly apiVersion: WooCommerceApiVersion;
}

export interface WooCommerceReadRequest extends WooCommerceConnectionValidationRequest {
  readonly since?: Date;
  readonly perPage?: number;
  readonly maxPages?: number;
}

export interface WooCommerceRestClientOptions {
  readonly fetchFn?: typeof fetch;
  readonly timeoutMs?: number;
}

const defaultTimeoutMs = 10_000;
const defaultPerPage = 100;

export class WooCommerceRestClient {
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: WooCommerceRestClientOptions = {}) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  }

  async validateConnection(
    request: WooCommerceConnectionValidationRequest,
  ): Promise<ConnectionHealth> {
    const endpoint = buildSystemStatusUrl(request.storeUrl, request.apiVersion);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      await this.getJson(endpoint, request, controller.signal);

      return {
        status: ConnectionHealthStatus.Healthy,
        checkedAt: new Date(),
        message: "WooCommerce credentials validated successfully.",
        metadata: {
          endpoint: endpoint.pathname,
          readOnly: true,
        },
      };
    } catch (error) {
      if (
        error instanceof IntegrationAuthenticationError ||
        error instanceof IntegrationConnectionError
      ) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new IntegrationConnectionError("WooCommerce validation timed out.", {
          platform: IntegrationPlatform.WooCommerce,
          cause: error,
        });
      }

      throw new IntegrationConnectionError("WooCommerce store is unreachable.", {
        platform: IntegrationPlatform.WooCommerce,
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  listOrders(request: WooCommerceReadRequest): Promise<readonly WooCommerceRawOrder[]> {
    return this.getPaginated("orders", request, { supportsIncremental: true });
  }

  listProducts(request: WooCommerceReadRequest): Promise<readonly WooCommerceRawProduct[]> {
    return this.getPaginated("products", request, { supportsIncremental: true });
  }

  listCustomers(request: WooCommerceReadRequest): Promise<readonly WooCommerceRawCustomer[]> {
    return this.getPaginated("customers", request, { supportsIncremental: true });
  }

  listInventoryProducts(
    request: WooCommerceReadRequest,
  ): Promise<readonly WooCommerceRawInventoryProduct[]> {
    return this.getPaginated("products", request, {
      additionalParams: {
        _fields: "id,name,sku,manage_stock,stock_quantity,stock_status,date_modified_gmt",
      },
      supportsIncremental: true,
    });
  }

  listProductCategories(
    request: WooCommerceReadRequest,
  ): Promise<readonly WooCommerceRawProductCategory[]> {
    return this.getPaginated("products/categories", request, { supportsIncremental: false });
  }

  listRefunds(request: WooCommerceReadRequest): Promise<readonly WooCommerceRawRefund[]> {
    return this.getPaginated("refunds", request, { supportsIncremental: true });
  }

  private async getPaginated<T>(
    resourcePath: string,
    request: WooCommerceReadRequest,
    options: {
      readonly additionalParams?: Readonly<Record<string, string>>;
      readonly supportsIncremental: boolean;
    },
  ): Promise<readonly T[]> {
    const perPage = request.perPage ?? defaultPerPage;
    const maxPages = request.maxPages ?? Number.POSITIVE_INFINITY;
    const records: T[] = [];
    let page = 1;
    let totalPages: number | undefined;

    while (page <= maxPages && (totalPages === undefined || page <= totalPages)) {
      const endpoint = buildWooCommerceUrl(request.storeUrl, request.apiVersion, resourcePath);
      endpoint.searchParams.set("page", String(page));
      endpoint.searchParams.set("per_page", String(perPage));

      if (request.since && options.supportsIncremental) {
        endpoint.searchParams.set("after", request.since.toISOString());
      }

      for (const [key, value] of Object.entries(options.additionalParams ?? {})) {
        endpoint.searchParams.set(key, value);
      }

      const response = await this.getJson(endpoint, request);
      const pageRecords = (await response.json()) as T[];

      records.push(...pageRecords);
      totalPages = getTotalPages(response) ?? totalPages;

      if (totalPages === undefined && pageRecords.length < perPage) {
        break;
      }

      page += 1;
    }

    return records;
  }

  private async getJson(
    endpoint: URL,
    request: WooCommerceConnectionValidationRequest,
    signal?: AbortSignal,
  ): Promise<Response> {
    const controller = signal ? undefined : new AbortController();
    const requestSignal = signal ?? controller?.signal;
    const timeout = controller ? setTimeout(() => controller.abort(), this.timeoutMs) : undefined;

    try {
      const requestInit: RequestInit = {
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${Buffer.from(
            `${request.consumerKey}:${request.consumerSecret}`,
            "utf8",
          ).toString("base64")}`,
        },
        method: "GET",
        ...(requestSignal ? { signal: requestSignal } : {}),
      };

      const response = await this.fetchFn(endpoint, requestInit);

      if (response.status === 401 || response.status === 403) {
        throw new IntegrationAuthenticationError("WooCommerce authentication failed.", {
          platform: IntegrationPlatform.WooCommerce,
          metadata: { status: response.status },
        });
      }

      if (response.status === 429) {
        throw new IntegrationConnectionError("WooCommerce rate limit exceeded.", {
          platform: IntegrationPlatform.WooCommerce,
          metadata: { status: response.status },
        });
      }

      if (!response.ok) {
        throw new IntegrationConnectionError("WooCommerce store returned an error.", {
          platform: IntegrationPlatform.WooCommerce,
          metadata: { status: response.status },
        });
      }

      return response;
    } catch (error) {
      if (
        error instanceof IntegrationAuthenticationError ||
        error instanceof IntegrationConnectionError
      ) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new IntegrationConnectionError("WooCommerce request timed out.", {
          platform: IntegrationPlatform.WooCommerce,
          cause: error,
        });
      }

      throw new IntegrationConnectionError("WooCommerce store is unreachable.", {
        platform: IntegrationPlatform.WooCommerce,
        cause: error,
      });
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }
}

function buildSystemStatusUrl(storeUrl: string, apiVersion: WooCommerceApiVersion): URL {
  return buildWooCommerceUrl(storeUrl, apiVersion, "system_status");
}

function buildWooCommerceUrl(
  storeUrl: string,
  apiVersion: WooCommerceApiVersion,
  resourcePath: string,
): URL {
  let baseUrl: URL;

  try {
    baseUrl = new URL(storeUrl);
  } catch (error) {
    throw new IntegrationConnectionError("WooCommerce store URL is invalid.", {
      platform: IntegrationPlatform.WooCommerce,
      cause: error,
    });
  }

  baseUrl.pathname = joinUrlPath(baseUrl.pathname, "wp-json", apiVersion, resourcePath);
  baseUrl.search = "";
  baseUrl.hash = "";

  return baseUrl;
}

function getTotalPages(response: Response): number | undefined {
  const headerValue = response.headers.get("x-wp-totalpages");

  if (!headerValue) {
    return undefined;
  }

  const totalPages = Number.parseInt(headerValue, 10);

  return Number.isFinite(totalPages) ? totalPages : undefined;
}

function joinUrlPath(...parts: readonly string[]): string {
  return `/${parts
    .flatMap((part) => part.split("/"))
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/")}`;
}
