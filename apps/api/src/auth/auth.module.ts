import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { EmailModule } from "../email/email.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { JwtAccessTokenGuard } from "./guards/jwt-access-token.guard.js";
import { PlatformAdminGuard } from "./guards/platform-admin.guard.js";
import {
  BcryptPasswordHasherService,
  EmailVerificationTokenService,
  PasswordResetTokenService,
} from "./security/index.js";
import { JwtSessionConfigService, JwtSessionTokenService } from "./session/index.js";

@Module({
  imports: [DatabaseModule, EmailModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    BcryptPasswordHasherService,
    EmailVerificationTokenService,
    PasswordResetTokenService,
    {
      provide: JwtSessionConfigService,
      useFactory: () => new JwtSessionConfigService(),
    },
    JwtSessionTokenService,
    JwtAccessTokenGuard,
    PlatformAdminGuard,
  ],
  exports: [
    AuthService,
    BcryptPasswordHasherService,
    JwtAccessTokenGuard,
    JwtSessionTokenService,
    PlatformAdminGuard,
  ],
})
export class AuthModule {}
