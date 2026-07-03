import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { CommerceOrdersController } from "./commerce-orders.controller.js";
import { CommerceOrdersService } from "./commerce-orders.service.js";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [CommerceOrdersController],
  providers: [CommerceOrdersService],
  exports: [CommerceOrdersService],
})
export class CommerceModule {}
