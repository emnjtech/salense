import type {
  IntegrationConfiguration,
  IntegrationCredentialMetadata,
} from "../../types/integration-configuration.js";
import { IntegrationPlatform } from "../../types/integration-platform.js";

export interface WooCommerceIntegrationConfiguration extends IntegrationConfiguration {
  readonly platform: IntegrationPlatform.WooCommerce;
  readonly storeUrl: string;
  readonly consumerKeyMetadata: IntegrationCredentialMetadata;
  readonly consumerSecretMetadata: IntegrationCredentialMetadata;
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

  if (configuration.apiVersion !== WooCommerceApiVersion.WcV3) {
    throw new Error("WooCommerce API version is not supported.");
  }

  if (!configuration.consumerKeyMetadata?.configured) {
    throw new Error("WooCommerce consumer key metadata is required.");
  }

  if (!configuration.consumerSecretMetadata?.configured) {
    throw new Error("WooCommerce consumer secret metadata is required.");
  }

  return {
    ...configuration,
    platform: IntegrationPlatform.WooCommerce,
    storeUrl,
    consumerKeyMetadata: configuration.consumerKeyMetadata,
    consumerSecretMetadata: configuration.consumerSecretMetadata,
    apiVersion: configuration.apiVersion,
  };
}
