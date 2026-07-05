export enum StorePlatform {
  WooCommerce = "WOOCOMMERCE",
  AmazonSeller = "AMAZON_SELLER",
  TikTokShop = "TIKTOK_SHOP",
  Shopify = "SHOPIFY",
}

export interface SupportedStorePlatform {
  readonly platform: StorePlatform;
  readonly label: string;
  readonly requiresStoreUrl: boolean;
  readonly requiresRegion: boolean;
}

export const SUPPORTED_STORE_PLATFORMS: readonly SupportedStorePlatform[] = [
  {
    platform: StorePlatform.WooCommerce,
    label: "WooCommerce",
    requiresStoreUrl: true,
    requiresRegion: false,
  },
  {
    platform: StorePlatform.AmazonSeller,
    label: "Amazon Seller",
    requiresStoreUrl: false,
    requiresRegion: true,
  },
  {
    platform: StorePlatform.TikTokShop,
    label: "TikTok Shop",
    requiresStoreUrl: false,
    requiresRegion: true,
  },
  {
    platform: StorePlatform.Shopify,
    label: "Shopify",
    requiresStoreUrl: true,
    requiresRegion: false,
  },
];

export function isSupportedStorePlatform(platform: string): platform is StorePlatform {
  return Object.values(StorePlatform).includes(platform as StorePlatform);
}
