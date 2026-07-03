export enum IntegrationPlatform {
  WooCommerce = "WOOCOMMERCE",
  AmazonSeller = "AMAZON_SELLER",
  TikTokShop = "TIKTOK_SHOP",
}

export const SUPPORTED_INTEGRATION_PLATFORMS = Object.freeze([
  IntegrationPlatform.WooCommerce,
  IntegrationPlatform.AmazonSeller,
  IntegrationPlatform.TikTokShop,
] as const);

export function isSupportedIntegrationPlatform(platform: string): platform is IntegrationPlatform {
  return SUPPORTED_INTEGRATION_PLATFORMS.some(
    (supportedPlatform) => supportedPlatform === platform,
  );
}
