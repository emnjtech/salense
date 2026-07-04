import {
  IntegrationAuthenticationError,
  IntegrationConnectionError,
} from "../../errors/integration-error.js";
import { ConnectionHealthStatus, type ConnectionHealth } from "../../types/connection-health.js";
import { IntegrationPlatform } from "../../types/integration-platform.js";
import { TikTokShopApiRegion } from "./tiktok-shop-configuration.js";
import type {
  TikTokShopRawInventory,
  TikTokShopRawOrder,
  TikTokShopRawProduct,
  TikTokShopRawRefund,
} from "./tiktok-shop-raw-models.js";

export interface TikTokShopConnectionValidationRequest {
  readonly accessToken: string;
  readonly region: TikTokShopApiRegion;
  readonly shopCipher: string;
  readonly shopId: string;
}

export interface TikTokShopReadRequest extends TikTokShopConnectionValidationRequest {
  readonly maxPages?: number;
  readonly pageSize?: number;
  readonly since?: Date;
}

export interface TikTokShopRestClientOptions {
  readonly fetchFn?: typeof fetch;
  readonly timeoutMs?: number;
}

interface TikTokShopEnvelope<TPayload> {
  readonly code?: number;
  readonly data?: TPayload;
  readonly message?: string;
  readonly request_id?: string;
}

const defaultTimeoutMs = 15_000;

export class TikTokShopRestClient {
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: TikTokShopRestClientOptions = {}) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  }

  async validateConnection(
    request: TikTokShopConnectionValidationRequest,
  ): Promise<ConnectionHealth> {
    await this.get<{ shops?: readonly unknown[] }>(request, "/authorization/202309/shops", {});

    return {
      checkedAt: new Date(),
      status: ConnectionHealthStatus.Healthy,
    };
  }

  async listOrders(request: TikTokShopReadRequest): Promise<readonly TikTokShopRawOrder[]> {
    return this.collectPaginated(request, "/order/202309/orders/search", "orders");
  }

  async listProducts(request: TikTokShopReadRequest): Promise<readonly TikTokShopRawProduct[]> {
    return this.collectPaginated(request, "/product/202309/products/search", "products");
  }

  async listInventory(request: TikTokShopReadRequest): Promise<readonly TikTokShopRawInventory[]> {
    const products = await this.listProducts(request);

    return products.flatMap((product) =>
      (product.skus ?? []).flatMap((sku) =>
        (sku.inventory ?? []).map((inventory) =>
          withoutUndefined({
            product_id: product.id,
            product_name: product.title,
            quantity: inventory.quantity,
            seller_sku: sku.seller_sku,
            sku_id: sku.id,
            warehouse_id: inventory.warehouse_id,
          }) as TikTokShopRawInventory,
        ),
      ),
    );
  }

  async listRefunds(request: TikTokShopReadRequest): Promise<readonly TikTokShopRawRefund[]> {
    return this.collectPaginated(request, "/return_refund/202309/returns/search", "returns");
  }

  private async collectPaginated<TItem>(
    request: TikTokShopReadRequest,
    path: string,
    dataKey: string,
  ): Promise<readonly TItem[]> {
    const maxPages = request.maxPages ?? 10;
    const pageSize = request.pageSize ?? 50;
    const items: TItem[] = [];
    let pageToken: string | undefined;

    for (let page = 0; page < maxPages; page += 1) {
      const payload = await this.get<Record<string, unknown>>(request, path, {
        ...(pageToken ? { page_token: pageToken } : {}),
        page_size: String(pageSize),
        ...(request.since ? { update_time_from: Math.floor(request.since.getTime() / 1000).toString() } : {}),
      });
      const nextItems = payload[dataKey];

      if (Array.isArray(nextItems)) {
        items.push(...(nextItems as TItem[]));
      }

      const nextPageToken =
        typeof payload.next_page_token === "string" ? payload.next_page_token : undefined;

      if (!nextPageToken) {
        break;
      }

      pageToken = nextPageToken;
    }

    return items;
  }

  private async get<TPayload>(
    request: TikTokShopConnectionValidationRequest,
    path: string,
    query: Readonly<Record<string, string>>,
  ): Promise<TPayload> {
    const endpoint = new URL(`${getBaseUrl(request.region)}${path}`);
    endpoint.searchParams.set("shop_cipher", request.shopCipher);
    endpoint.searchParams.set("shop_id", request.shopId);

    for (const [key, value] of Object.entries(query)) {
      endpoint.searchParams.set(key, value);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(endpoint, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${request.accessToken}`,
          "x-tts-access-token": request.accessToken,
        },
        method: "GET",
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        throw new IntegrationAuthenticationError("TikTok Shop authentication failed.", {
          platform: IntegrationPlatform.TikTokShop,
          metadata: { status: response.status },
        });
      }

      if (!response.ok) {
        throw new IntegrationConnectionError("TikTok Shop request failed.", {
          platform: IntegrationPlatform.TikTokShop,
          metadata: { status: response.status },
        });
      }

      const body = (await response.json()) as TikTokShopEnvelope<TPayload>;

      if (body.code !== undefined && body.code !== 0) {
        throw new IntegrationConnectionError(body.message ?? "TikTok Shop API returned an error.", {
          platform: IntegrationPlatform.TikTokShop,
          metadata: { code: body.code, requestId: body.request_id },
        });
      }

      return body.data ?? ({} as TPayload);
    } catch (error) {
      if (error instanceof IntegrationAuthenticationError || error instanceof IntegrationConnectionError) {
        throw error;
      }

      throw new IntegrationConnectionError("TikTok Shop request could not be completed.", {
        cause: error,
        platform: IntegrationPlatform.TikTokShop,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

function getBaseUrl(region: TikTokShopApiRegion): string {
  switch (region) {
    case TikTokShopApiRegion.NorthAmerica:
      return "https://open-api.tiktokglobalshop.com";
    case TikTokShopApiRegion.SoutheastAsia:
      return "https://open-api.tiktokglobalshop.com";
    case TikTokShopApiRegion.Europe:
      return "https://open-api.tiktokglobalshop.com";
  }
}

function withoutUndefined<T extends Readonly<Record<string, unknown>>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
