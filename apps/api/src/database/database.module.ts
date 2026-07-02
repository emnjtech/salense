import { Module } from "@nestjs/common";
import { disconnectPrismaClient, getPrismaClient } from "@salense/database";
import { PRISMA_CLIENT_DISCONNECT, PRISMA_CLIENT_FACTORY } from "./database.tokens.js";
import { PrismaService } from "./prisma.service.js";

@Module({
  providers: [
    { provide: PRISMA_CLIENT_FACTORY, useValue: getPrismaClient },
    { provide: PRISMA_CLIENT_DISCONNECT, useValue: disconnectPrismaClient },
    PrismaService,
  ],
  exports: [PrismaService],
})
export class DatabaseModule {}
