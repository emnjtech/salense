import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { URL, URLSearchParams } from "node:url";
import { BadRequestException, Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import {
  AmazonSellerApiRegion,
  defaultShopifyAdminApiVersion,
  normalizeShopifyDomain,
  toAmazonSellerApiRegion,
} from "@salense/integrations";
import type {
  MarketplaceOAuthStartQueryDto,
  ShopifyOAuthStartQueryDto,
  StoreOAuthCallbackQueryDto,
} from "./dto/store-oauth-query.dto.js";
import { StoreIntegrationsService } from "./store-integrations.service.js";
import type { StoreOAuthStartResponse } from "./types/store-oauth-response.type.js";
import { StorePlatform } from "./types/store-platform.enum.js";

interface OAuthStateRecord {
  readonly expiresAt: Date;
  readonly marketplaceId: string | null;
  readonly platform: StorePlatform;
  readonly region: string | null;
  readonly shopDomain: string | null;
  readonly storeName: string;
  readonly userId: string;
}

interface ShopifyTokenResponse {
  readonly access_token?: unknown;
  readonly scope?: unknown;
}

interface AmazonSellerTokenResponse {
  readonly access_token?: unknown;
  readonly expires_in?: unknown;
  readonly refresh_token?: unknown;
  readonly token_type?: unknown;
}

const stateTtlMs = 10 * 60 * 1000;
const oauthStates = new Map<string, OAuthStateRecord>();

@Injectable()
export class StoreIntegrationOAuthService {
  constructor(
    @Inject(StoreIntegrationsService)
    private readonly storeIntegrationsService: StoreIntegrationsService,
  ) {}

  startShopifyOAuth(
    userId: string,
    query: ShopifyOAuthStartQueryDto,
  ): StoreOAuthStartResponse {
    const clientId = getRequiredEnv("SHOPIFY_CLIENT_ID");
    const redirectUri = getRequiredEnv("SHOPIFY_REDIRECT_URI");
    const scopes =
      process.env.SHOPIFY_SCOPES?.trim() ||
      "read_orders,read_products,read_customers,read_inventory";
    const shopDomain = normalizeShopifyDomain(query.shop);

    if (!shopDomain) {
      throw new BadRequestException("Enter a valid Shopify shop domain.");
    }

    const { expiresAt, state } = this.createState({
      marketplaceId: null,
      platform: StorePlatform.Shopify,
      region: null,
      shopDomain,
      storeName: query.storeName?.trim() || shopDomain,
      userId,
    });
    const authorizationUrl = new URL(`https://${shopDomain}/admin/oauth/authorize`);
    authorizationUrl.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      state,
    }).toString();

    return {
      authorizationUrl: authorizationUrl.toString(),
      platform: StorePlatform.Shopify,
      stateExpiresAt: expiresAt.toISOString(),
    };
  }

  startAmazonSellerOAuth(
    userId: string,
    query: MarketplaceOAuthStartQueryDto,
  ): StoreOAuthStartResponse {
    const appId = getRequiredEnv("AMAZON_SP_API_APP_ID");
    const redirectUri = getRequiredEnv("AMAZON_SP_API_REDIRECT_URI");
    const region = query.region?.trim().toUpperCase() || "GB";
    const { expiresAt, state } = this.createState({
      marketplaceId: query.marketplaceId?.trim() || getAmazonSellerDefaultMarketplaceId(region),
      platform: StorePlatform.AmazonSeller,
      region,
      shopDomain: null,
      storeName: query.storeName?.trim() || `Amazon Seller ${region}`,
      userId,
    });
    const authorizationUrl = new URL(getAmazonSellerAuthorizationBaseUrl(region));
    authorizationUrl.search = new URLSearchParams({
      application_id: appId,
      state,
    }).toString();
    const authorizationVersion = process.env.AMAZON_SP_API_AUTHORIZATION_VERSION?.trim();
    if (authorizationVersion) {
      authorizationUrl.searchParams.set("version", authorizationVersion);
    }
    if (process.env.AMAZON_SP_API_INCLUDE_REDIRECT_URI === "true") {
      authorizationUrl.searchParams.set("redirect_uri", redirectUri);
    }

    return {
      authorizationUrl: authorizationUrl.toString(),
      platform: StorePlatform.AmazonSeller,
      stateExpiresAt: expiresAt.toISOString(),
    };
  }

  startTikTokShopOAuth(
    userId: string,
    query: MarketplaceOAuthStartQueryDto,
  ): StoreOAuthStartResponse {
    const appKey = getRequiredEnv("TIKTOK_SHOP_APP_KEY");
    const redirectUri = getRequiredEnv("TIKTOK_SHOP_REDIRECT_URI");
    const region = query.region?.trim().toUpperCase() || "GB";
    const { expiresAt, state } = this.createState({
      marketplaceId: null,
      platform: StorePlatform.TikTokShop,
      region,
      shopDomain: null,
      storeName: query.storeName?.trim() || `TikTok Shop ${region}`,
      userId,
    });
    const authorizationUrl = new URL("https://services.tiktokshop.com/open/authorize");
    authorizationUrl.search = new URLSearchParams({
      app_key: appKey,
      redirect_uri: redirectUri,
      state,
    }).toString();

    return {
      authorizationUrl: authorizationUrl.toString(),
      platform: StorePlatform.TikTokShop,
      stateExpiresAt: expiresAt.toISOString(),
    };
  }

  async handleShopifyCallback(query: StoreOAuthCallbackQueryDto): Promise<string> {
    const state = this.consumeState(query.state, StorePlatform.Shopify);

    if (query.error) {
      throw new BadRequestException("Shopify authorization was not completed.");
    }

    if (!query.code?.trim()) {
      throw new BadRequestException("Shopify authorization code is missing.");
    }

    const shopDomain = state.shopDomain;

    if (!shopDomain) {
      throw new BadRequestException("Shopify shop domain is missing from authorization state.");
    }

    const accessToken = await this.exchangeShopifyCodeForAccessToken(shopDomain, query.code.trim());

    await this.storeIntegrationsService.prepareStoreConnection(state.userId, {
      platform: StorePlatform.Shopify,
      shopifyCredentials: {
        accessToken,
        apiVersion: defaultShopifyAdminApiVersion,
        shopDomain,
      },
      storeName: state.storeName,
      storeUrl: `https://${shopDomain}`,
    });

    return getStoreIntegrationsRedirectUrl("connected=shopify");
  }

  async handleAmazonSellerCallback(query: StoreOAuthCallbackQueryDto): Promise<string> {
    if (query.error) {
      throw new BadRequestException("Amazon Seller authorization was not completed.");
    }

    if (query.amazon_callback_uri?.trim() && query.amazon_state?.trim()) {
      this.validateState(query.state, StorePlatform.AmazonSeller);
      const amazonCallbackUrl = new URL(query.amazon_callback_uri.trim());
      amazonCallbackUrl.searchParams.set("state", query.amazon_state.trim());
      return amazonCallbackUrl.toString();
    }

    const state = this.consumeState(query.state, StorePlatform.AmazonSeller);
    const authorizationCode = query.spapi_oauth_code?.trim() || query.code?.trim();
    const sellerId = query.selling_partner_id?.trim();

    if (!authorizationCode) {
      throw new BadRequestException("Amazon Seller authorization code is missing.");
    }

    if (!sellerId) {
      throw new BadRequestException("Amazon Seller account identifier is missing.");
    }

    const tokenResponse = await this.exchangeAmazonSellerCodeForTokens(authorizationCode);
    const marketplaceId =
      state.marketplaceId ?? getAmazonSellerDefaultMarketplaceId(state.region ?? "GB");
    const region = state.region ?? "GB";

    await this.storeIntegrationsService.prepareStoreConnection(state.userId, {
      amazonSellerCredentials: {
        accessToken: tokenResponse.accessToken,
        marketplaceId,
        refreshToken: tokenResponse.refreshToken,
        sellerId,
      },
      platform: StorePlatform.AmazonSeller,
      region,
      storeName: state.storeName,
    });

    return getStoreIntegrationsRedirectUrl("connected=amazon-seller");
  }

  handleTikTokShopCallback(query: StoreOAuthCallbackQueryDto): string {
    this.consumeState(query.state, StorePlatform.TikTokShop);
    return getStoreIntegrationsRedirectUrl("authorization=tiktok-shop-setup-required");
  }

  private createState(input: Omit<OAuthStateRecord, "expiresAt">): {
    readonly expiresAt: Date;
    readonly state: string;
  } {
    const id = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + stateTtlMs);
    oauthStates.set(id, { ...input, expiresAt });
    const signature = signStateId(id);

    return { expiresAt, state: `${id}.${signature}` };
  }

  private consumeState(state: string, platform: StorePlatform): OAuthStateRecord {
    const { id, record } = this.readState(state, platform);
    oauthStates.delete(id);

    return record;
  }

  private validateState(state: string, platform: StorePlatform): OAuthStateRecord {
    return this.readState(state, platform).record;
  }

  private readState(
    state: string,
    platform: StorePlatform,
  ): {
    readonly id: string;
    readonly record: OAuthStateRecord;
  } {
    const [id, signature] = state.split(".");

    if (!id || !signature || !isValidStateSignature(id, signature)) {
      throw new BadRequestException("Store authorization session is invalid.");
    }

    const record = oauthStates.get(id);

    if (!record || record.platform !== platform) {
      throw new BadRequestException("Store authorization session is invalid.");
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException("Store authorization session has expired.");
    }

    return { id, record };
  }

  private async exchangeShopifyCodeForAccessToken(
    shopDomain: string,
    code: string,
  ): Promise<string> {
    const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      body: JSON.stringify({
        client_id: getRequiredEnv("SHOPIFY_CLIENT_ID"),
        client_secret: getRequiredEnv("SHOPIFY_CLIENT_SECRET"),
        code,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new BadRequestException("Shopify authorization could not be completed.");
    }

    const body = (await response.json()) as ShopifyTokenResponse;

    if (typeof body.access_token !== "string" || !body.access_token.trim()) {
      throw new BadRequestException("Shopify did not return an access token.");
    }

    return body.access_token;
  }

  private async exchangeAmazonSellerCodeForTokens(code: string): Promise<{
    readonly accessToken: string;
    readonly refreshToken: string;
  }> {
    const response = await fetch("https://api.amazon.com/auth/o2/token", {
      body: new URLSearchParams({
        client_id: getRequiredEnv("AMAZON_LWA_CLIENT_ID"),
        client_secret: getRequiredEnv("AMAZON_LWA_CLIENT_SECRET"),
        code,
        grant_type: "authorization_code",
      }),
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new BadRequestException("Amazon Seller authorization could not be completed.");
    }

    const body = (await response.json()) as AmazonSellerTokenResponse;

    if (typeof body.access_token !== "string" || !body.access_token.trim()) {
      throw new BadRequestException("Amazon Seller did not return an access token.");
    }

    if (typeof body.refresh_token !== "string" || !body.refresh_token.trim()) {
      throw new BadRequestException("Amazon Seller did not return a refresh token.");
    }

    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
    };
  }
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new ServiceUnavailableException(
      `${name} is required before store authorization can start.`,
    );
  }

  return value;
}

function signStateId(id: string): string {
  return createHmac("sha256", getStateSigningSecret()).update(id).digest("base64url");
}

function isValidStateSignature(id: string, signature: string): boolean {
  const expected = Buffer.from(signStateId(id));
  const received = Buffer.from(signature);

  return expected.length === received.length && timingSafeEqual(expected, received);
}

function getStateSigningSecret(): string {
  const secret =
    process.env.JWT_ACCESS_TOKEN_SECRET?.trim() ||
    process.env.SALENSE_CREDENTIAL_ENCRYPTION_KEY?.trim();

  if (!secret) {
    throw new ServiceUnavailableException(
      "JWT_ACCESS_TOKEN_SECRET or SALENSE_CREDENTIAL_ENCRYPTION_KEY is required for store authorization state signing.",
    );
  }

  return secret;
}

function getStoreIntegrationsRedirectUrl(query: string): string {
  const publicAppUrl = process.env.PUBLIC_APP_URL?.trim() || "https://app.getsalense.com";
  return `${publicAppUrl.replace(/\/+$/u, "")}/store-integrations?${query}`;
}

function getAmazonSellerAuthorizationBaseUrl(region: string): string {
  const apiRegion = toAmazonSellerApiRegion(region);
  const host =
    apiRegion === AmazonSellerApiRegion.NorthAmerica
      ? "sellercentral.amazon.com"
      : apiRegion === AmazonSellerApiRegion.FarEast
        ? "sellercentral.amazon.co.jp"
        : "sellercentral-europe.amazon.com";
  return `https://${host}/apps/authorize/consent`;
}

function getAmazonSellerDefaultMarketplaceId(region: string): string {
  switch (region.trim().toUpperCase()) {
    case "CA":
      return "A2EUQ1WTGCTBG2";
    case "MX":
      return "A1AM78C64UM0Y8";
    case "US":
      return "ATVPDKIKX0DER";
    case "AE":
      return "A2VIGQ35RCS4UG";
    case "DE":
      return "A1PA6795UKMFR9";
    case "EG":
      return "ARBP9OOSHTCHU";
    case "ES":
      return "A1RKKUPIHCS9HS";
    case "FR":
      return "A13V1IB3VIYZZH";
    case "IN":
      return "A21TJRUUN4KGV";
    case "IT":
      return "APJ6JRA9NG5V4";
    case "NL":
      return "A1805IZSGTT6HS";
    case "PL":
      return "A1C3SOZRARQ6R3";
    case "SA":
      return "A17E79C6D8DWNP";
    case "SE":
      return "A2NODRKZP88ZB9";
    case "TR":
      return "A33AVAJ2PDY3EV";
    case "GB":
    case "UK":
    default:
      return "A1F83G8C2ARO7P";
  }
}
