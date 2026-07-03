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
