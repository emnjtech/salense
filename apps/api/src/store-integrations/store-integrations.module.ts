import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { IntegrationFrameworkModule } from "../integrations/integration-framework.module.js";
import {
  AMAZON_SELLER_REST_CLIENT,
  AmazonSellerSyncService,
  createAmazonSellerRestClient,
} from "./amazon-seller-sync.service.js";
import { AesCredentialEncryptionService } from "./security/credential-encryption.service.js";
import { StoreIntegrationsController } from "./store-integrations.controller.js";
import { StoreIntegrationsService } from "./store-integrations.service.js";
import { CommerceSyncCursorService } from "./sync-cursors/commerce-sync-cursor.service.js";
import { AmazonSellerSyncWorkerHandler } from "./sync-queue/amazon-seller-sync-worker.handler.js";
import { createBullMqSyncQueue } from "./sync-queue/bullmq-sync-queue.js";
import { SYNC_QUEUE } from "./sync-queue/sync-queue.types.js";
import { TikTokShopSyncWorkerHandler } from "./sync-queue/tiktok-shop-sync-worker.handler.js";
import { WooCommerceSyncSchedulingService } from "./sync-queue/woocommerce-sync-scheduling.service.js";
import { WooCommerceSyncWorkerHandler } from "./sync-queue/woocommerce-sync-worker.handler.js";
import {
  createTikTokShopRestClient,
  TIKTOK_SHOP_REST_CLIENT,
  TikTokShopSyncService,
} from "./tiktok-shop-sync.service.js";
import { WooCommerceCommercePersistenceService } from "./woocommerce-commerce-persistence.service.js";
import {
  createWooCommerceRestClient,
  WOOCOMMERCE_REST_CLIENT,
  WooCommerceSyncService,
} from "./woocommerce-sync.service.js";

@Module({
  imports: [AuditModule, AuthModule, DatabaseModule, IntegrationFrameworkModule],
  controllers: [StoreIntegrationsController],
  providers: [
    {
      provide: AesCredentialEncryptionService,
      useFactory: () => new AesCredentialEncryptionService(),
    },
    CommerceSyncCursorService,
    AmazonSellerSyncService,
    AmazonSellerSyncWorkerHandler,
    StoreIntegrationsService,
    TikTokShopSyncService,
    TikTokShopSyncWorkerHandler,
    WooCommerceCommercePersistenceService,
    WooCommerceSyncSchedulingService,
    WooCommerceSyncService,
    WooCommerceSyncWorkerHandler,
    { provide: SYNC_QUEUE, useFactory: createBullMqSyncQueue },
    { provide: AMAZON_SELLER_REST_CLIENT, useFactory: createAmazonSellerRestClient },
    { provide: TIKTOK_SHOP_REST_CLIENT, useFactory: createTikTokShopRestClient },
    { provide: WOOCOMMERCE_REST_CLIENT, useFactory: createWooCommerceRestClient },
  ],
  exports: [
    AmazonSellerSyncService,
    AmazonSellerSyncWorkerHandler,
    StoreIntegrationsService,
    TikTokShopSyncService,
    TikTokShopSyncWorkerHandler,
    CommerceSyncCursorService,
    WooCommerceCommercePersistenceService,
    WooCommerceSyncSchedulingService,
    WooCommerceSyncService,
    WooCommerceSyncWorkerHandler,
  ],
})
export class StoreIntegrationsModule {}
