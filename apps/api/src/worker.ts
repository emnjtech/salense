import { NestFactory } from "@nestjs/core";
import { StoreIntegrationsModule } from "./store-integrations/store-integrations.module.js";
import {
  AmazonSellerSyncJobName,
  amazonSellerSyncJobNames,
  ShopifySyncJobName,
  shopifySyncJobNames,
  syncQueueName,
  TikTokShopSyncJobName,
  tikTokShopSyncJobNames,
  WooCommerceSyncJobName,
  wooCommerceSyncJobNames,
} from "./store-integrations/sync-queue/sync-queue.types.js";
import { AmazonSellerSyncWorkerHandler } from "./store-integrations/sync-queue/amazon-seller-sync-worker.handler.js";
import { ShopifySyncWorkerHandler } from "./store-integrations/sync-queue/shopify-sync-worker.handler.js";
import { TikTokShopSyncWorkerHandler } from "./store-integrations/sync-queue/tiktok-shop-sync-worker.handler.js";
import { WooCommerceSyncWorkerHandler } from "./store-integrations/sync-queue/woocommerce-sync-worker.handler.js";

export {
  AmazonSellerSyncJobName,
  amazonSellerSyncJobNames,
  ShopifySyncJobName,
  shopifySyncJobNames,
  syncQueueName,
  TikTokShopSyncJobName,
  tikTokShopSyncJobNames,
  WooCommerceSyncJobName,
  wooCommerceSyncJobNames,
};

export interface WooCommerceSyncWorkerHandlerContext {
  readonly amazonSellerHandler: AmazonSellerSyncWorkerHandler;
  readonly close: () => Promise<void>;
  readonly handler: WooCommerceSyncWorkerHandler;
  readonly shopifyHandler: ShopifySyncWorkerHandler;
  readonly tikTokShopHandler: TikTokShopSyncWorkerHandler;
}

export async function createWooCommerceSyncWorkerHandlerContext(): Promise<WooCommerceSyncWorkerHandlerContext> {
  const app = await NestFactory.createApplicationContext(StoreIntegrationsModule, {
    logger: false,
  });

  return {
    amazonSellerHandler: app.get(AmazonSellerSyncWorkerHandler),
    close: () => app.close(),
    handler: app.get(WooCommerceSyncWorkerHandler),
    shopifyHandler: app.get(ShopifySyncWorkerHandler),
    tikTokShopHandler: app.get(TikTokShopSyncWorkerHandler),
  };
}
