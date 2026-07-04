import {
  IntegrationAuthenticationError,
  IntegrationConnectionError,
} from "../../errors/integration-error.js";
import { ConnectionHealthStatus, type ConnectionHealth } from "../../types/connection-health.js";
import { IntegrationPlatform } from "../../types/integration-platform.js";
import { AmazonSellerApiRegion } from "./amazon-seller-configuration.js";
import type {
  AmazonSellerRawCatalogItem,
  AmazonSellerRawCatalogItemsResponse,
  AmazonSellerRawFinancialEventsResponse,
  AmazonSellerRawInventorySummariesResponse,
  AmazonSellerRawInventorySummary,
  AmazonSellerRawOrder,
  AmazonSellerRawOrderItem,
  AmazonSellerRawOrderItemsResponse,
  AmazonSellerRawOrdersResponse,
  AmazonSellerRawRefundEvent,
} from "./amazon-seller-raw-models.js";

export interface AmazonSellerConnectionValidationRequest {
  readonly accessToken: string;
  readonly marketplaceId: string;
  readonly region: AmazonSellerApiRegion;
  readonly sellerId: string;
}

export interface AmazonSellerReadRequest extends AmazonSellerConnectionValidationRequest {
  readonly maxPages?: number;
  readonly pageSize?: number;
  readonly since?: Date;
}

export interface AmazonSellerRestClientOptions {
  readonly fetchFn?: typeof fetch;
  readonly timeoutMs?: number;
}

const defaultTimeoutMs = 10_000;
const defaultPageSize = 50;

export class AmazonSellerRestClient {
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: AmazonSellerRestClientOptions = {}) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  }

  async validateConnection(
    request: AmazonSellerConnectionValidationRequest,
  ): Promise<ConnectionHealth> {
    const endpoint = this.buildUrl(request.region, "/sellers/v1/marketplaceParticipations");

    await this.getJson(endpoint, request);

    return {
      checkedAt: new Date(),
      message: "Amazon Seller credentials validated successfully.",
      metadata: {
        endpoint: endpoint.pathname,
        marketplaceId: request.marketplaceId,
        readOnly: true,
        sellerId: request.sellerId,
      },
      status: ConnectionHealthStatus.Healthy,
    };
  }

  async listOrders(request: AmazonSellerReadRequest): Promise<readonly AmazonSellerRawOrder[]> {
    const records: AmazonSellerRawOrder[] = [];

    await this.getPaginated<AmazonSellerRawOrdersResponse>(request, "/orders/v0/orders", {
      initialParams: {
        CreatedAfter: (request.since ?? defaultSinceDate()).toISOString(),
        MarketplaceIds: request.marketplaceId,
      },
      nextTokenParam: "NextToken",
      readRecords: (body) => body.payload?.Orders ?? [],
      readToken: (body) => body.payload?.NextToken,
    }, records);

    return records;
  }

  async listOrderItems(
    request: AmazonSellerReadRequest,
    amazonOrderId: string,
  ): Promise<readonly AmazonSellerRawOrderItem[]> {
    const records: AmazonSellerRawOrderItem[] = [];

    await this.getPaginated<AmazonSellerRawOrderItemsResponse>(
      request,
      `/orders/v0/orders/${encodeURIComponent(amazonOrderId)}/orderItems`,
      {
        initialParams: {},
        nextTokenParam: "NextToken",
        readRecords: (body) => body.payload?.OrderItems ?? [],
        readToken: (body) => body.payload?.NextToken,
      },
      records,
    );

    return records;
  }

  async listProducts(
    request: AmazonSellerReadRequest,
  ): Promise<readonly AmazonSellerRawCatalogItem[]> {
    const records: AmazonSellerRawCatalogItem[] = [];

    await this.getPaginated<AmazonSellerRawCatalogItemsResponse>(
      request,
      "/catalog/2022-04-01/items",
      {
        initialParams: {
          includedData: "summaries,productTypes,attributes",
          marketplaceIds: request.marketplaceId,
          pageSize: String(request.pageSize ?? defaultPageSize),
          sellerId: request.sellerId,
        },
        nextTokenParam: "pageToken",
        readRecords: (body) => body.items ?? [],
        readToken: (body) => body.pagination?.nextToken,
      },
      records,
    );

    return records;
  }

  async listInventory(
    request: AmazonSellerReadRequest,
  ): Promise<readonly AmazonSellerRawInventorySummary[]> {
    const records: AmazonSellerRawInventorySummary[] = [];

    await this.getPaginated<AmazonSellerRawInventorySummariesResponse>(
      request,
      "/fba/inventory/v1/summaries",
      {
        initialParams: {
          details: "true",
          granularityId: request.marketplaceId,
          granularityType: "Marketplace",
          marketplaceIds: request.marketplaceId,
        },
        nextTokenParam: "nextToken",
        readRecords: (body) => body.inventorySummaries ?? [],
        readToken: (body) => body.pagination?.nextToken,
      },
      records,
    );

    return records;
  }

  async listRefunds(request: AmazonSellerReadRequest): Promise<readonly AmazonSellerRawRefundEvent[]> {
    const records: AmazonSellerRawRefundEvent[] = [];

    await this.getPaginated<AmazonSellerRawFinancialEventsResponse>(
      request,
      "/finances/v0/financialEvents",
      {
        initialParams: {
          PostedAfter: (request.since ?? defaultSinceDate()).toISOString(),
        },
        nextTokenParam: "NextToken",
        readRecords: (body) => body.payload?.FinancialEvents?.RefundEventList ?? [],
        readToken: (body) => body.payload?.NextToken,
      },
      records,
    );

    return records;
  }

  private async getPaginated<TBody>(
    request: AmazonSellerReadRequest,
    path: string,
    options: {
      readonly initialParams: Readonly<Record<string, string>>;
      readonly nextTokenParam: string;
      readonly readRecords: (body: TBody) => readonly unknown[];
      readonly readToken: (body: TBody) => string | undefined;
    },
    records: unknown[],
  ): Promise<void> {
    const maxPages = request.maxPages ?? Number.POSITIVE_INFINITY;
    let page = 1;
    let nextToken: string | undefined;

    do {
      const endpoint = this.buildUrl(request.region, path);
      for (const [key, value] of Object.entries(options.initialParams)) {
        endpoint.searchParams.set(key, value);
      }
      if (nextToken) {
        endpoint.searchParams.set(options.nextTokenParam, nextToken);
      }

      const response = await this.getJson(endpoint, request);
      const body = (await response.json()) as TBody;
      records.push(...options.readRecords(body));
      nextToken = options.readToken(body);
      page += 1;
    } while (nextToken && page <= maxPages);
  }

  private async getJson(
    endpoint: URL,
    request: AmazonSellerConnectionValidationRequest,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(endpoint, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${request.accessToken}`,
          "x-amz-access-token": request.accessToken,
        },
        method: "GET",
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        throw new IntegrationAuthenticationError("Amazon Seller authentication failed.", {
          platform: IntegrationPlatform.AmazonSeller,
          metadata: { status: response.status },
        });
      }

      if (response.status === 429) {
        throw new IntegrationConnectionError("Amazon Seller rate limit exceeded.", {
          platform: IntegrationPlatform.AmazonSeller,
          metadata: { status: response.status },
        });
      }

      if (!response.ok) {
        throw new IntegrationConnectionError("Amazon Seller API returned an error.", {
          platform: IntegrationPlatform.AmazonSeller,
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
        throw new IntegrationConnectionError("Amazon Seller request timed out.", {
          platform: IntegrationPlatform.AmazonSeller,
          cause: error,
        });
      }

      throw new IntegrationConnectionError("Amazon Seller API is unreachable.", {
        platform: IntegrationPlatform.AmazonSeller,
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildUrl(region: AmazonSellerApiRegion, path: string): URL {
    return new URL(path, getEndpointBaseUrl(region));
  }
}

function defaultSinceDate(): Date {
  return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
}

function getEndpointBaseUrl(region: AmazonSellerApiRegion): string {
  switch (region) {
    case AmazonSellerApiRegion.NorthAmerica:
      return "https://sellingpartnerapi-na.amazon.com";
    case AmazonSellerApiRegion.FarEast:
      return "https://sellingpartnerapi-fe.amazon.com";
    case AmazonSellerApiRegion.Europe:
      return "https://sellingpartnerapi-eu.amazon.com";
  }
}

