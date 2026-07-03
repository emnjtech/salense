import type { IntegrationConfiguration } from "../../types/integration-configuration.js";
import { IntegrationPlatform } from "../../types/integration-platform.js";

export interface WooCommerceCredentialMetadata {
  readonly configured: boolean;
  readonly keyId?: string;
  readonly storedAt?: Date;
}

export interface WooCommerceIntegrationConfiguration extends IntegrationConfiguration {
  readonly platform: IntegrationPlatform.WooCommerce;
  readonly storeUrl: string;
  readonly consumerKeyMetadata?: WooCommerceCredentialMetadata;
  readonly consumerSecretMetadata?: WooCommerceCredentialMetadata;
  readonly apiVersion: WooCommerceApiVersion;
}

export enum WooCommerceApiVersion {
  WcV3 = "wc/v3",
}

export function validateWooCommerceConfiguration(
  configuration: IntegrationConfiguration,
): WooCommerceIntegrationConfiguration {
  if (configuration.platform !== IntegrationPlatform.WooCommerce) {
    throw new Error("WooCommerce provider requires a WooCommerce integration configuration.");
  }

  const storeUrl = configuration.storeUrl?.trim();

  if (!storeUrl) {
    throw new Error("WooCommerce store URL is required.");
  }

  return {
    ...configuration,
    platform: IntegrationPlatform.WooCommerce,
    storeUrl,
    apiVersion: WooCommerceApiVersion.WcV3,
  };
}
