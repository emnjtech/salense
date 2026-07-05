import { IntegrationConfigurationError } from "../../errors/integration-error.js";
import type { IntegrationConfiguration } from "../../types/integration-configuration.js";
import { IntegrationPlatform } from "../../types/integration-platform.js";

export const defaultShopifyAdminApiVersion = "2024-10";

export interface ShopifyConfiguration {
  readonly accessToken?: string;
  readonly apiVersion: string;
  readonly shopDomain: string;
}

export function validateShopifyConfiguration(
  configuration: IntegrationConfiguration,
): ShopifyConfiguration {
  if (configuration.platform !== IntegrationPlatform.Shopify) {
    throw new IntegrationConfigurationError("Shopify configuration received the wrong platform.", {
      platform: configuration.platform,
    });
  }

  const shopDomain = normalizeShopifyDomain(configuration.storeUrl ?? configuration.consumerKey);

  if (!shopDomain) {
    throw new IntegrationConfigurationError("Shopify shop domain is required.", {
      platform: IntegrationPlatform.Shopify,
    });
  }

  return {
    ...(configuration.accessTokenHash ? { accessToken: configuration.accessTokenHash } : {}),
    apiVersion: configuration.apiVersion?.trim() || defaultShopifyAdminApiVersion,
    shopDomain,
  };
}

export function normalizeShopifyDomain(value: string | undefined): string | undefined {
  const rawValue = value?.trim().replace(/^https?:\/\//iu, "").replace(/\/.*$/u, "").toLowerCase();

  if (!rawValue) {
    return undefined;
  }

  return rawValue.endsWith(".myshopify.com") ? rawValue : `${rawValue}.myshopify.com`;
}
