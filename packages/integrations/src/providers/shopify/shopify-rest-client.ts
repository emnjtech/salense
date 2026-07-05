import {
  IntegrationAuthenticationError,
  IntegrationConnectionError,
} from "../../errors/integration-error.js";
import { ConnectionHealthStatus, type ConnectionHealth } from "../../types/connection-health.js";
import { IntegrationPlatform } from "../../types/integration-platform.js";
import { defaultShopifyAdminApiVersion } from "./shopify-configuration.js";
import type {
  ShopifyRawCollection,
  ShopifyRawCustomer,
  ShopifyRawInventory,
  ShopifyRawOrder,
  ShopifyRawProduct,
  ShopifyRawRefund,
} from "./shopify-raw-models.js";

export interface ShopifyConnectionValidationRequest {
  readonly accessToken: string;
  readonly apiVersion?: string;
  readonly shopDomain: string;
}

export interface ShopifyReadRequest extends ShopifyConnectionValidationRequest {
  readonly maxPages?: number;
  readonly pageSize?: number;
  readonly since?: Date;
}

export interface ShopifyRestClientOptions {
  readonly fetchFn?: typeof fetch;
  readonly timeoutMs?: number;
}

const defaultTimeoutMs = 15_000;

export class ShopifyRestClient {
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: ShopifyRestClientOptions = {}) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  }

  async validateConnection(request: ShopifyConnectionValidationRequest): Promise<ConnectionHealth> {
    await this.getJson<{ shop?: unknown }>(request, "shop.json", {});

    return {
      checkedAt: new Date(),
      status: ConnectionHealthStatus.Healthy,
    };
  }

  async listOrders(request: ShopifyReadRequest): Promise<readonly ShopifyRawOrder[]> {
    return this.collectPaginated<ShopifyRawOrder>(request, "orders.json", "orders", {
      status: "any",
    });
  }

  async listProducts(request: ShopifyReadRequest): Promise<readonly ShopifyRawProduct[]> {
    return this.collectPaginated<ShopifyRawProduct>(request, "products.json", "products", {
      status: "any",
    });
  }

  async listCustomers(request: ShopifyReadRequest): Promise<readonly ShopifyRawCustomer[]> {
    return this.collectPaginated<ShopifyRawCustomer>(request, "customers.json", "customers", {});
  }

  async listInventory(request: ShopifyReadRequest): Promise<readonly ShopifyRawInventory[]> {
    const products = await this.listProducts(request);

    return products.flatMap((product) =>
      (product.variants ?? []).map((variant) =>
        withoutUndefined({
          inventory_item_id: variant.inventory_item_id,
          product_id: product.id,
          product_title: product.title,
          quantity: variant.inventory_quantity,
          sku: variant.sku,
          variant_id: variant.id,
        }) as ShopifyRawInventory,
      ),
    );
  }

  async listCollections(request: ShopifyReadRequest): Promise<readonly ShopifyRawCollection[]> {
    const customCollections = await this.collectPaginated<ShopifyRawCollection>(
      request,
      "custom_collections.json",
      "custom_collections",
      {},
    );
    const smartCollections = await this.collectPaginated<ShopifyRawCollection>(
      request,
      "smart_collections.json",
      "smart_collections",
      {},
    );

    return [...customCollections, ...smartCollections];
  }

  async listRefunds(request: ShopifyReadRequest): Promise<readonly ShopifyRawRefund[]> {
    const orders = await this.listOrders(request);

    return orders.flatMap((order) =>
      (order.refunds ?? []).map((refund) => ({
        ...refund,
        order_id: refund.order_id ?? order.id,
      })),
    );
  }

  private async collectPaginated<TItem>(
    request: ShopifyReadRequest,
    path: string,
    dataKey: string,
    query: Readonly<Record<string, string>>,
  ): Promise<readonly TItem[]> {
    const maxPages = request.maxPages ?? 10;
    const pageSize = request.pageSize ?? 50;
    const items: TItem[] = [];
    let pageInfo: string | undefined;

    for (let page = 0; page < maxPages; page += 1) {
      const payload = await this.getJson<Record<string, unknown>>(request, path, {
        ...query,
        limit: String(pageSize),
        ...(pageInfo ? { page_info: pageInfo } : {}),
        ...(!pageInfo && request.since ? { updated_at_min: request.since.toISOString() } : {}),
      });
      const nextItems = payload[dataKey];

      if (Array.isArray(nextItems)) {
        items.push(...(nextItems as TItem[]));
      }

      pageInfo = getNextPageInfo(payload.__linkHeader);

      if (!pageInfo) {
        break;
      }
    }

    return items;
  }

  private async getJson<TPayload>(
    request: ShopifyConnectionValidationRequest,
    path: string,
    query: Readonly<Record<string, string>>,
  ): Promise<TPayload> {
    const endpoint = new URL(
      `https://${request.shopDomain}/admin/api/${request.apiVersion ?? defaultShopifyAdminApiVersion}/${path}`,
    );

    for (const [key, value] of Object.entries(query)) {
      endpoint.searchParams.set(key, value);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(endpoint, {
        headers: {
          Accept: "application/json",
          "X-Shopify-Access-Token": request.accessToken,
        },
        method: "GET",
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        throw new IntegrationAuthenticationError("Shopify authentication failed.", {
          platform: IntegrationPlatform.Shopify,
          metadata: { status: response.status },
        });
      }

      if (!response.ok) {
        throw new IntegrationConnectionError("Shopify request failed.", {
          platform: IntegrationPlatform.Shopify,
          metadata: { status: response.status },
        });
      }

      const body = (await response.json()) as TPayload;
      const linkHeader = response.headers.get("link");

      if (typeof body === "object" && body !== null && linkHeader) {
        return { ...(body as Record<string, unknown>), __linkHeader: linkHeader } as TPayload;
      }

      return body;
    } catch (error) {
      if (error instanceof IntegrationAuthenticationError || error instanceof IntegrationConnectionError) {
        throw error;
      }

      throw new IntegrationConnectionError("Shopify request could not be completed.", {
        cause: error,
        platform: IntegrationPlatform.Shopify,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

function getNextPageInfo(linkHeader: unknown): string | undefined {
  if (typeof linkHeader !== "string") {
    return undefined;
  }

  const nextLink = linkHeader
    .split(",")
    .find((part) => part.includes('rel="next"'));
  const match = nextLink?.match(/[?&]page_info=([^&>]+)/u);

  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

function withoutUndefined<T extends Readonly<Record<string, unknown>>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
