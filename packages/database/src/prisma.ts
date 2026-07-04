import { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export type PrismaClientInstance = PrismaClient;
export type PrismaClientOptions = ConstructorParameters<typeof PrismaClient>[0];

const globalForPrisma = globalThis as typeof globalThis & {
  salensePrismaClient?: PrismaClient;
};

export function createPrismaClient(options?: PrismaClientOptions): PrismaClient {
  return new PrismaClient(options);
}

export function getPrismaClient(options?: PrismaClientOptions): PrismaClient {
  globalForPrisma.salensePrismaClient ??= createPrismaClient(options);

  return globalForPrisma.salensePrismaClient;
}

export async function disconnectPrismaClient(): Promise<void> {
  await globalForPrisma.salensePrismaClient?.$disconnect();
  delete globalForPrisma.salensePrismaClient
}

export { PrismaClient };
export type { Prisma };
