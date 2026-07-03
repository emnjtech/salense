import type { IntegrationPlatform } from "./integration-platform.js";

export interface IntegrationConfiguration {
  readonly platform: IntegrationPlatform;
  readonly businessId: string;
  readonly storeId?: string;
  readonly storeName?: string;
  readonly storeUrl?: string;
  readonly region?: string;
  readonly accessTokenHash?: string;
  readonly accessTokenMetadata?: Readonly<Record<string, unknown>>;
  readonly refreshTokenHash?: string;
  readonly refreshTokenMetadata?: Readonly<Record<string, unknown>>;
}
