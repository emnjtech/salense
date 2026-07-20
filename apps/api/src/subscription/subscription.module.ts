import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { EmailModule } from "../email/email.module.js";
import { SubscriptionController } from "./subscription.controller.js";
import { SubscriptionService } from "./subscription.service.js";

@Module({
  controllers: [SubscriptionController],
  imports: [AuditModule, AuthModule, DatabaseModule, EmailModule],
  providers: [SubscriptionService],
})
export class SubscriptionModule {}
