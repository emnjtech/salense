import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { UsersModule } from "../users/users.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { BcryptPasswordHasherService } from "./security/index.js";

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [AuthController],
  providers: [AuthService, BcryptPasswordHasherService],
  exports: [AuthService],
})
export class AuthModule {}
