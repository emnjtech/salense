export enum IntegrationPlatform {
  WooCommerce = "WOOCOMMERCE",
  AmazonSeller = "AMAZON_SELLER",
  TikTokShop = "TIKTOK_SHOP",
  Shopify = "SHOPIFY",
}

export const SUPPORTED_INTEGRATION_PLATFORMS = Object.freeze([
  IntegrationPlatform.WooCommerce,
  IntegrationPlatform.AmazonSeller,
  IntegrationPlatform.TikTokShop,
  IntegrationPlatform.Shopify,
] as const);

export function isSupportedIntegrationPlatform(platform: string): platform is IntegrationPlatform {
  return SUPPORTED_INTEGRATION_PLATFORMS.some(
    (supportedPlatform) => supportedPlatform === platform,
  );
}
