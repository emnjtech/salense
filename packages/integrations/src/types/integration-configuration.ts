import type { IntegrationPlatform } from "./integration-platform.js";

export interface IntegrationCredentialMetadata {
  readonly configured: boolean;
  readonly keyId?: string;
  readonly storedAt?: Date;
}

export interface IntegrationConfiguration {
  readonly platform: IntegrationPlatform;
  readonly businessId: string;
  readonly storeId?: string;
  readonly storeName?: string;
  readonly storeUrl?: string;
  readonly region?: string;
  readonly apiVersion?: string;
  readonly consumerKeyMetadata?: IntegrationCredentialMetadata;
  readonly consumerSecretMetadata?: IntegrationCredentialMetadata;
  readonly accessTokenHash?: string;
  readonly accessTokenMetadata?: Readonly<Record<string, unknown>>;
  readonly refreshTokenHash?: string;
  readonly refreshTokenMetadata?: Readonly<Record<string, unknown>>;
}
