import { fetchWithSessionRefresh } from "../auth-session";

export enum StorePlatform {
  WooCommerce = "WOOCOMMERCE",
  AmazonSeller = "AMAZON_SELLER",
  TikTokShop = "TIKTOK_SHOP",
  Shopify = "SHOPIFY",
}

export enum StoreConnectionStatus {
  PendingValidation = "PENDING_VALIDATION",
  Connected = "CONNECTED",
  Synchronising = "SYNCHRONISING",
  Disconnected = "DISCONNECTED",
  AuthenticationExpired = "AUTHENTICATION_EXPIRED",
  Error = "ERROR",
}

export enum WooCommerceApiVersion {
  WcV3 = "wc/v3",
}

export interface SupportedStorePlatform {
  readonly platform: StorePlatform;
  readonly label: string;
  readonly requiresStoreUrl: boolean;
  readonly requiresRegion: boolean;
}

export interface ConnectedStore {
  readonly id: string;
  readonly businessId: string;
  readonly platform: StorePlatform;
  readonly storeName: string;
  readonly storeUrl: string | null;
  readonly region: string | null;
  readonly connectionStatus: StoreConnectionStatus;
  readonly lastSynchronisedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface StoreSyncCursorStatus {
  readonly errorSummary: Readonly<Record<string, unknown>> | null;
  readonly lastAttemptedSyncedAt: string | null;
  readonly lastSuccessfulSyncedAt: string | null;
  readonly resource: string;
  readonly status: string;
}

export interface StoreSyncJobStatus {
  readonly failedReason?: string;
  readonly finishedAt?: string;
  readonly jobId: string;
  readonly platform:
    | StorePlatform.WooCommerce
    | StorePlatform.AmazonSeller
    | StorePlatform.TikTokShop
    | StorePlatform.Shopify;
  readonly queuedAt: string;
  readonly status: "QUEUED" | "ACTIVE" | "COMPLETED" | "FAILED" | "UNKNOWN";
  readonly storeId: string;
}

export interface StoreSyncStatus {
  readonly connectionStatus: StoreConnectionStatus;
  readonly cursors: readonly StoreSyncCursorStatus[];
  readonly jobs: readonly StoreSyncJobStatus[];
  readonly lastSynchronisedAt: string | null;
  readonly platform: StorePlatform;
  readonly storeId: string;
}

export interface WooCommerceConnectionInput {
  readonly apiVersion: WooCommerceApiVersion;
  readonly consumerKey: string;
  readonly consumerSecret: string;
  readonly storeName: string;
  readonly storeUrl: string;
}

export interface AmazonSellerConnectionInput {
  readonly accessToken: string;
  readonly marketplaceId: string;
  readonly refreshToken: string;
  readonly region: string;
  readonly sellerId: string;
  readonly storeName: string;
}

export interface TikTokShopConnectionInput {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly region: string;
  readonly shopCipher: string;
  readonly shopId: string;
  readonly storeName: string;
}

export interface ShopifyConnectionInput {
  readonly accessToken: string;
  readonly apiVersion?: string;
  readonly shopDomain: string;
  readonly storeName: string;
  readonly storeUrl: string;
}

export interface ManualSyncJobResponse {
  readonly jobId: string;
  readonly platform: StorePlatform;
  readonly queuedAt: string;
  readonly status: "QUEUED";
  readonly storeId: string;
}

export interface SyncScheduleResponse {
  readonly everyMs: number;
  readonly jobId: string;
  readonly platform: StorePlatform;
  readonly scheduledAt: string;
  readonly status: "SCHEDULED";
  readonly storeId: string;
}

export interface SyncScheduleRemovalResponse {
  readonly jobId: string;
  readonly platform: StorePlatform;
  readonly removedAt: string;
  readonly status: "REMOVED" | "NOT_FOUND";
  readonly storeId: string;
}

export interface DisconnectStoreResponse {
  readonly disconnectedAt: string | null;
  readonly platform: StorePlatform;
  readonly status: StoreConnectionStatus.Disconnected;
  readonly storeId: string;
}

export interface StoreOAuthStartResponse {
  readonly authorizationUrl: string;
  readonly platform: StorePlatform;
  readonly stateExpiresAt: string;
}

export interface StoreIntegrationsApiClient {
  listSupportedPlatforms(): Promise<readonly SupportedStorePlatform[]>;
  listConnectedStores(): Promise<readonly ConnectedStore[]>;
  connectAmazonSeller(input: AmazonSellerConnectionInput): Promise<ConnectedStore>;
  connectShopify(input: ShopifyConnectionInput): Promise<ConnectedStore>;
  connectTikTokShop(input: TikTokShopConnectionInput): Promise<ConnectedStore>;
  connectWooCommerce(input: WooCommerceConnectionInput): Promise<ConnectedStore>;
  startAmazonSellerOAuth(input?: {
    readonly region?: string;
    readonly storeName?: string;
  }): Promise<StoreOAuthStartResponse>;
  startShopifyOAuth(input: {
    readonly shop: string;
    readonly storeName?: string;
  }): Promise<StoreOAuthStartResponse>;
  startTikTokShopOAuth(input?: {
    readonly region?: string;
    readonly storeName?: string;
  }): Promise<StoreOAuthStartResponse>;
  requestManualSync(storeId: string): Promise<ManualSyncJobResponse>;
  scheduleSync(storeId: string): Promise<SyncScheduleResponse>;
  removeSchedule(storeId: string): Promise<SyncScheduleRemovalResponse>;
  disconnectStore(storeId: string): Promise<DisconnectStoreResponse>;
  getStoreSyncStatus(storeId: string): Promise<StoreSyncStatus>;
}

export class ApiClientError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

interface StoreIntegrationsApiClientOptions {
  readonly accessTokenProvider: () => string | null;
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

export function createStoreIntegrationsApiClient(
  options: StoreIntegrationsApiClientOptions,
): StoreIntegrationsApiClient {
  const baseUrl = trimTrailingSlash(options.baseUrl ?? getDefaultApiBaseUrl());
  const fetchImpl = options.fetchImpl ?? fetch;

  async function request<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
    const token = options.accessTokenProvider();
    const headers = new Headers(init.headers);

    if (init.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    const response = await fetchWithSessionRefresh(
      `${baseUrl}${path}`,
      {
        ...init,
        headers,
      },
      {
        accessToken: token ?? undefined,
        baseUrl,
        fetchImpl,
      },
    );

    if (!response.ok) {
      throw new ApiClientError(await getErrorMessage(response), response.status);
    }

    return (await response.json()) as TResponse;
  }

  return {
    connectAmazonSeller(input) {
      return request<ConnectedStore>("/store-integrations/connect", {
        body: JSON.stringify(toAmazonSellerConnectionPayload(input)),
        method: "POST",
      });
    },
    connectShopify(input) {
      return request<ConnectedStore>("/store-integrations/connect", {
        body: JSON.stringify(toShopifyConnectionPayload(input)),
        method: "POST",
      });
    },
    connectTikTokShop(input) {
      return request<ConnectedStore>("/store-integrations/connect", {
        body: JSON.stringify(toTikTokShopConnectionPayload(input)),
        method: "POST",
      });
    },
    connectWooCommerce(input) {
      return request<ConnectedStore>("/store-integrations/connect", {
        body: JSON.stringify(toWooCommerceConnectionPayload(input)),
        method: "POST",
      });
    },
    disconnectStore(storeId) {
      return request<DisconnectStoreResponse>("/store-integrations/disconnect", {
        body: JSON.stringify({ storeId }),
        method: "POST",
      });
    },
    getStoreSyncStatus(storeId) {
      return request<StoreSyncStatus>(`/store-integrations/stores/${storeId}/sync-status`);
    },
    listConnectedStores() {
      return request<readonly ConnectedStore[]>("/store-integrations/stores");
    },
    listSupportedPlatforms() {
      return request<readonly SupportedStorePlatform[]>("/store-integrations/supported-platforms");
    },
    removeSchedule(storeId) {
      return request<SyncScheduleRemovalResponse>("/store-integrations/sync-schedules/remove", {
        body: JSON.stringify({ storeId }),
        method: "POST",
      });
    },
    requestManualSync(storeId) {
      return request<ManualSyncJobResponse>("/store-integrations/sync", {
        body: JSON.stringify({ storeId }),
        method: "POST",
      });
    },
    scheduleSync(storeId) {
      return request<SyncScheduleResponse>("/store-integrations/sync-schedules", {
        body: JSON.stringify({ storeId }),
        method: "POST",
      });
    },
    startAmazonSellerOAuth(input = {}) {
      return request<StoreOAuthStartResponse>(
        `/store-integrations/amazon-seller/oauth/start${toQueryString(input)}`,
      );
    },
    startShopifyOAuth(input) {
      return request<StoreOAuthStartResponse>(
        `/store-integrations/shopify/oauth/start${toQueryString(input)}`,
      );
    },
    startTikTokShopOAuth(input = {}) {
      return request<StoreOAuthStartResponse>(
        `/store-integrations/tiktok-shop/oauth/start${toQueryString(input)}`,
      );
    },
  };
}

export function getDefaultApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
}

export function toWooCommerceConnectionPayload(input: WooCommerceConnectionInput): {
  readonly platform: StorePlatform.WooCommerce;
  readonly storeName: string;
  readonly storeUrl: string;
  readonly wooCommerceCredentials: {
    readonly apiVersion: WooCommerceApiVersion;
    readonly consumerKey: string;
    readonly consumerSecret: string;
  };
} {
  return {
    platform: StorePlatform.WooCommerce,
    storeName: input.storeName.trim(),
    storeUrl: input.storeUrl.trim(),
    wooCommerceCredentials: {
      apiVersion: input.apiVersion,
      consumerKey: input.consumerKey.trim(),
      consumerSecret: input.consumerSecret.trim(),
    },
  };
}

export function toAmazonSellerConnectionPayload(input: AmazonSellerConnectionInput): {
  readonly amazonSellerCredentials: {
    readonly accessToken: string;
    readonly marketplaceId: string;
    readonly refreshToken: string;
    readonly sellerId: string;
  };
  readonly platform: StorePlatform.AmazonSeller;
  readonly region: string;
  readonly storeName: string;
} {
  return {
    amazonSellerCredentials: {
      accessToken: input.accessToken.trim(),
      marketplaceId: input.marketplaceId.trim(),
      refreshToken: input.refreshToken.trim(),
      sellerId: input.sellerId.trim(),
    },
    platform: StorePlatform.AmazonSeller,
    region: input.region.trim().toUpperCase(),
    storeName: input.storeName.trim(),
  };
}

export function toTikTokShopConnectionPayload(input: TikTokShopConnectionInput): {
  readonly platform: StorePlatform.TikTokShop;
  readonly region: string;
  readonly storeName: string;
  readonly tikTokShopCredentials: {
    readonly accessToken: string;
    readonly refreshToken: string;
    readonly shopCipher: string;
    readonly shopId: string;
  };
} {
  return {
    platform: StorePlatform.TikTokShop,
    region: input.region.trim().toUpperCase(),
    storeName: input.storeName.trim(),
    tikTokShopCredentials: {
      accessToken: input.accessToken.trim(),
      refreshToken: input.refreshToken.trim(),
      shopCipher: input.shopCipher.trim(),
      shopId: input.shopId.trim(),
    },
  };
}

export function toShopifyConnectionPayload(input: ShopifyConnectionInput): {
  readonly platform: StorePlatform.Shopify;
  readonly shopifyCredentials: {
    readonly accessToken: string;
    readonly apiVersion?: string;
    readonly shopDomain: string;
  };
  readonly storeName: string;
  readonly storeUrl: string;
} {
  return {
    platform: StorePlatform.Shopify,
    shopifyCredentials: {
      accessToken: input.accessToken.trim(),
      ...(input.apiVersion?.trim() ? { apiVersion: input.apiVersion.trim() } : {}),
      shopDomain: input.shopDomain.trim(),
    },
    storeName: input.storeName.trim(),
    storeUrl: input.storeUrl.trim(),
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
    return "We could not complete the request. Please try again.";
  }

  return "We could not complete the request. Please try again.";
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, "");
}

function toQueryString(input: {
  readonly region?: string;
  readonly shop?: string;
  readonly storeName?: string;
}): string {
  const params = new URLSearchParams();

  Object.entries(input).forEach(([key, value]) => {
    if (value?.trim()) {
      params.set(key, value.trim());
    }
  });

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}
