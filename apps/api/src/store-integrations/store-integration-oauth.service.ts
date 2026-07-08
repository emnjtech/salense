import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { URL, URLSearchParams } from "node:url";
import { BadRequestException, Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import {
  defaultShopifyAdminApiVersion,
  normalizeShopifyDomain,
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
      platform: StorePlatform.AmazonSeller,
      region,
      shopDomain: null,
      storeName: query.storeName?.trim() || `Amazon Seller ${region}`,
      userId,
    });
    const authorizationUrl = new URL(getAmazonSellerAuthorizationBaseUrl(region));
    authorizationUrl.search = new URLSearchParams({
      application_id: appId,
      redirect_uri: redirectUri,
      state,
    }).toString();

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

  handleAmazonSellerCallback(query: StoreOAuthCallbackQueryDto): string {
    this.consumeState(query.state, StorePlatform.AmazonSeller);
    return getStoreIntegrationsRedirectUrl("authorization=amazon-seller-setup-required");
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
    const [id, signature] = state.split(".");

    if (!id || !signature || !isValidStateSignature(id, signature)) {
      throw new BadRequestException("Store authorization session is invalid.");
    }

    const record = oauthStates.get(id);
    oauthStates.delete(id);

    if (!record || record.platform !== platform) {
      throw new BadRequestException("Store authorization session is invalid.");
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException("Store authorization session has expired.");
    }

    return record;
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
  const publicAppUrl = process.env.PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  return `${publicAppUrl.replace(/\/+$/u, "")}/store-integrations?${query}`;
}

function getAmazonSellerAuthorizationBaseUrl(region: string): string {
  const lowerRegion = region.toLowerCase();
  const host = lowerRegion === "us" ? "sellercentral.amazon.com" : "sellercentral.amazon.co.uk";
  return `https://${host}/apps/authorize/consent`;
}
