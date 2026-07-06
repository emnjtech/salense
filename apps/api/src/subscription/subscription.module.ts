import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { SubscriptionController } from "./subscription.controller.js";
import { SubscriptionService } from "./subscription.service.js";

@Module({
  controllers: [SubscriptionController],
  imports: [DatabaseModule],
  providers: [SubscriptionService],
})
export class SubscriptionModule {}
