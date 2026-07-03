import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { IntegrationFrameworkModule } from "../integrations/integration-framework.module.js";
import { AesCredentialEncryptionService } from "./security/credential-encryption.service.js";
import { StoreIntegrationsController } from "./store-integrations.controller.js";
import { StoreIntegrationsService } from "./store-integrations.service.js";
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
    { provide: WOOCOMMERCE_REST_CLIENT, useFactory: createWooCommerceRestClient },
  ],
  exports: [StoreIntegrationsService, WooCommerceCommercePersistenceService, WooCommerceSyncService],
})
export class StoreIntegrationsModule {}
