import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { EmailModule } from "../email/email.module.js";
import { UsersModule } from "../users/users.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { JwtAccessTokenGuard } from "./guards/jwt-access-token.guard.js";
import { BcryptPasswordHasherService, EmailVerificationTokenService } from "./security/index.js";
import { JwtSessionConfigService, JwtSessionTokenService } from "./session/index.js";

@Module({
  imports: [DatabaseModule, EmailModule, UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    BcryptPasswordHasherService,
    EmailVerificationTokenService,
    {
      provide: JwtSessionConfigService,
      useFactory: () => new JwtSessionConfigService(),
    },
    JwtSessionTokenService,
    JwtAccessTokenGuard,
  ],
  exports: [AuthService],
})
export class AuthModule {}
