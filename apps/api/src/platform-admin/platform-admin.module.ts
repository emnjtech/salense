import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { PlatformAdminAuthController } from "./platform-admin-auth.controller.js";
import { PlatformAdminAuthService } from "./platform-admin-auth.service.js";
import { PlatformAdminService } from "./platform-admin.service.js";

@Module({
  controllers: [PlatformAdminAuthController],
  imports: [AuthModule, DatabaseModule],
  providers: [PlatformAdminAuthService, PlatformAdminService],
  exports: [PlatformAdminService],
})
export class PlatformAdminModule {}
