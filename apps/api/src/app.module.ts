import { Module } from "@nestjs/common";
import { AiModule } from "./ai/ai.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { CommerceModule } from "./commerce/commerce.module.js";
import { DashboardModule } from "./dashboard/dashboard.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { PlatformAdminModule } from "./platform-admin/platform-admin.module.js";
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
    AiModule,
    DashboardModule,
    CommerceModule,
    ReportsModule,
    SubscriptionModule,
    PlatformAdminModule,
  ],
})
export class AppModule {}
