import { PlaceholderIntegrationProvider } from "../providers/placeholder-integration-provider.js";
import { AmazonSellerIntegrationProvider } from "../providers/amazon-seller/amazon-seller-provider.js";
import { IntegrationRegistry } from "../registry/integration-registry.js";
import { IntegrationPlatform } from "../types/integration-platform.js";

export function createPlaceholderIntegrationRegistry(): IntegrationRegistry {
  return new IntegrationRegistry([
    new PlaceholderIntegrationProvider(IntegrationPlatform.WooCommerce),
    new AmazonSellerIntegrationProvider(),
    new PlaceholderIntegrationProvider(IntegrationPlatform.TikTokShop),
  ]);
}
