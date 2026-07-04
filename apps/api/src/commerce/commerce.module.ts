import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { CommerceCustomersController } from "./commerce-customers.controller.js";
import { CommerceCustomersService } from "./commerce-customers.service.js";
import { CommerceInventoryController } from "./commerce-inventory.controller.js";
import { CommerceInventoryService } from "./commerce-inventory.service.js";
import { CommerceOrdersController } from "./commerce-orders.controller.js";
import { CommerceOrdersService } from "./commerce-orders.service.js";
import { CommerceProductsController } from "./commerce-products.controller.js";
import { CommerceProductsService } from "./commerce-products.service.js";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [
    CommerceOrdersController,
    CommerceProductsController,
    CommerceCustomersController,
    CommerceInventoryController,
  ],
  providers: [
    CommerceOrdersService,
    CommerceProductsService,
    CommerceCustomersService,
    CommerceInventoryService,
  ],
  exports: [
    CommerceOrdersService,
    CommerceProductsService,
    CommerceCustomersService,
    CommerceInventoryService,
  ],
})
export class CommerceModule {}
