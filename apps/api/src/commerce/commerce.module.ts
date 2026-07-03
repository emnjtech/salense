import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { CommerceOrdersController } from "./commerce-orders.controller.js";
import { CommerceOrdersService } from "./commerce-orders.service.js";
import { CommerceProductsController } from "./commerce-products.controller.js";
import { CommerceProductsService } from "./commerce-products.service.js";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [CommerceOrdersController, CommerceProductsController],
  providers: [CommerceOrdersService, CommerceProductsService],
  exports: [CommerceOrdersService, CommerceProductsService],
})
export class CommerceModule {}
