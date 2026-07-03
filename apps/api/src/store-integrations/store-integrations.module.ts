import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { IntegrationFrameworkModule } from "../integrations/integration-framework.module.js";
import { AesCredentialEncryptionService } from "./security/credential-encryption.service.js";
import { StoreIntegrationsController } from "./store-integrations.controller.js";
import { StoreIntegrationsService } from "./store-integrations.service.js";

@Module({
  imports: [DatabaseModule, IntegrationFrameworkModule],
  controllers: [StoreIntegrationsController],
  providers: [AesCredentialEncryptionService, StoreIntegrationsService],
  exports: [StoreIntegrationsService],
})
export class StoreIntegrationsModule {}
