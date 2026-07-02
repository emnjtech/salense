import { Inject, Injectable, type OnApplicationShutdown } from "@nestjs/common";
import type { PrismaClientInstance } from "@salense/database";
import {
  PRISMA_CLIENT_DISCONNECT,
  PRISMA_CLIENT_FACTORY,
  type PrismaClientDisconnect,
  type PrismaClientFactory,
} from "./database.tokens.js";

@Injectable()
export class PrismaService implements OnApplicationShutdown {
  constructor(
    @Inject(PRISMA_CLIENT_FACTORY) private readonly getSharedClient: PrismaClientFactory,
    @Inject(PRISMA_CLIENT_DISCONNECT)
    private readonly disconnectSharedClient: PrismaClientDisconnect,
  ) {}

  get client(): PrismaClientInstance {
    return this.getSharedClient();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.disconnectSharedClient();
  }
}
