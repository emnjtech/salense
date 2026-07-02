import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { UsersModule } from "./users/users.module.js";

@Module({
  imports: [DatabaseModule, AuthModule, UsersModule],
})
export class AppModule {}
