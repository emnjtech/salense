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
