import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { StoreIntegrationsController } from "./store-integrations.controller.js";
import { StoreIntegrationsService } from "./store-integrations.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [StoreIntegrationsController],
  providers: [StoreIntegrationsService],
  exports: [StoreIntegrationsService],
})
export class StoreIntegrationsModule {}
