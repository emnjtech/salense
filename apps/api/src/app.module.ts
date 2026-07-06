import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.js";
import { CommerceModule } from "./commerce/commerce.module.js";
import { DashboardModule } from "./dashboard/dashboard.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { ReportsModule } from "./reports/reports.module.js";
import { StoreIntegrationsModule } from "./store-integrations/store-integrations.module.js";
import { SubscriptionModule } from "./subscription/subscription.module.js";
import { UsersModule } from "./users/users.module.js";

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    StoreIntegrationsModule,
    DashboardModule,
    CommerceModule,
    ReportsModule,
    SubscriptionModule,
  ],
})
export class AppModule {}
