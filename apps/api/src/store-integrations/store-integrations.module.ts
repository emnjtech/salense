import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { IntegrationFrameworkModule } from "../integrations/integration-framework.module.js";
import { AesCredentialEncryptionService } from "./security/credential-encryption.service.js";
import { StoreIntegrationsController } from "./store-integrations.controller.js";
import { StoreIntegrationsService } from "./store-integrations.service.js";
import { createBullMqSyncQueue } from "./sync-queue/bullmq-sync-queue.js";
import { SYNC_QUEUE } from "./sync-queue/sync-queue.types.js";
import { WooCommerceSyncWorkerHandler } from "./sync-queue/woocommerce-sync-worker.handler.js";
import { WooCommerceCommercePersistenceService } from "./woocommerce-commerce-persistence.service.js";
import {
  createWooCommerceRestClient,
  WOOCOMMERCE_REST_CLIENT,
  WooCommerceSyncService,
} from "./woocommerce-sync.service.js";

@Module({
  imports: [DatabaseModule, IntegrationFrameworkModule],
  controllers: [StoreIntegrationsController],
  providers: [
    AesCredentialEncryptionService,
    StoreIntegrationsService,
    WooCommerceCommercePersistenceService,
    WooCommerceSyncService,
    WooCommerceSyncWorkerHandler,
    { provide: SYNC_QUEUE, useFactory: createBullMqSyncQueue },
    { provide: WOOCOMMERCE_REST_CLIENT, useFactory: createWooCommerceRestClient },
  ],
  exports: [
    StoreIntegrationsService,
    WooCommerceCommercePersistenceService,
    WooCommerceSyncService,
    WooCommerceSyncWorkerHandler,
  ],
})
export class StoreIntegrationsModule {}
