import { Module } from "@nestjs/common";
import { JwtAccessTokenGuard } from "../auth/guards/jwt-access-token.guard.js";
import { JwtSessionConfigService, JwtSessionTokenService } from "../auth/session/index.js";
import { DatabaseModule } from "../database/database.module.js";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: JwtSessionConfigService,
      useFactory: () => new JwtSessionConfigService(),
    },
    JwtSessionTokenService,
    JwtAccessTokenGuard,
  ],
  exports: [UsersService],
})
export class UsersModule {}
