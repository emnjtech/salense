import { PlaceholderIntegrationProvider } from "../providers/placeholder-integration-provider.js";
import { IntegrationRegistry } from "../registry/integration-registry.js";
import { IntegrationPlatform } from "../types/integration-platform.js";

export function createPlaceholderIntegrationRegistry(): IntegrationRegistry {
  return new IntegrationRegistry([
    new PlaceholderIntegrationProvider(IntegrationPlatform.WooCommerce),
    new PlaceholderIntegrationProvider(IntegrationPlatform.AmazonSeller),
    new PlaceholderIntegrationProvider(IntegrationPlatform.TikTokShop),
  ]);
}
