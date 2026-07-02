import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { EmailModule } from "../email/email.module.js";
import { UsersModule } from "../users/users.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { BcryptPasswordHasherService, EmailVerificationTokenService } from "./security/index.js";

@Module({
  imports: [DatabaseModule, EmailModule, UsersModule],
  controllers: [AuthController],
  providers: [AuthService, BcryptPasswordHasherService, EmailVerificationTokenService],
  exports: [AuthService],
})
export class AuthModule {}
