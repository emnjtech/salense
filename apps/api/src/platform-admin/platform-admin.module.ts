import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { PlatformAdminAuthController } from "./platform-admin-auth.controller.js";
import { PlatformAdminAuthService } from "./platform-admin-auth.service.js";

@Module({
  controllers: [PlatformAdminAuthController],
  imports: [AuthModule, DatabaseModule],
  providers: [PlatformAdminAuthService],
})
export class PlatformAdminModule {}
