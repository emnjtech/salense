export const syncQueueName = "salense-sync";

export const defaultSyncScheduleIntervalMs = 60 * 60 * 1000;

export enum WooCommerceSyncJobName {
  ManualFullSync = "woocommerce.manual.full-sync",
  OrdersSync = "woocommerce.orders.sync",
  ProductsSync = "woocommerce.products.sync",
  CustomersSync = "woocommerce.customers.sync",
  InventorySync = "woocommerce.inventory.sync",
  CategoriesSync = "woocommerce.categories.sync",
  RefundsSync = "woocommerce.refunds.sync",
}

export const wooCommerceSyncJobNames = Object.values(WooCommerceSyncJobName);

export function createWooCommerceRecurringSyncJobId(storeId: string): string {
  return `woocommerce:auto:full-sync:${storeId}`;
}

export enum AmazonSellerSyncJobName {
  ManualFullSync = "amazon-seller.manual.full-sync",
  OrdersSync = "amazon-seller.orders.sync",
  ProductsSync = "amazon-seller.products.sync",
  CustomersSync = "amazon-seller.customers.sync",
  InventorySync = "amazon-seller.inventory.sync",
  CategoriesSync = "amazon-seller.categories.sync",
  RefundsSync = "amazon-seller.refunds.sync",
}

export const amazonSellerSyncJobNames = Object.values(AmazonSellerSyncJobName);

export function createAmazonSellerRecurringSyncJobId(storeId: string): string {
  return `amazon-seller:auto:full-sync:${storeId}`;
}

export enum TikTokShopSyncJobName {
  ManualFullSync = "tiktok-shop.manual.full-sync",
  OrdersSync = "tiktok-shop.orders.sync",
  ProductsSync = "tiktok-shop.products.sync",
  CustomersSync = "tiktok-shop.customers.sync",
  InventorySync = "tiktok-shop.inventory.sync",
  CategoriesSync = "tiktok-shop.categories.sync",
  RefundsSync = "tiktok-shop.refunds.sync",
}

export const tikTokShopSyncJobNames = Object.values(TikTokShopSyncJobName);

export function createTikTokShopRecurringSyncJobId(storeId: string): string {
  return `tiktok-shop:auto:full-sync:${storeId}`;
}

export enum ShopifySyncJobName {
  ManualFullSync = "shopify.manual.full-sync",
  OrdersSync = "shopify.orders.sync",
  ProductsSync = "shopify.products.sync",
  CustomersSync = "shopify.customers.sync",
  InventorySync = "shopify.inventory.sync",
  CategoriesSync = "shopify.categories.sync",
  RefundsSync = "shopify.refunds.sync",
}

export const shopifySyncJobNames = Object.values(ShopifySyncJobName);

export function createShopifyRecurringSyncJobId(storeId: string): string {
  return `shopify:auto:full-sync:${storeId}`;
}
