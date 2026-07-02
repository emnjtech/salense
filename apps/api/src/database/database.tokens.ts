import type { PrismaClientInstance } from "@salense/database";

export const PRISMA_CLIENT_FACTORY = Symbol("PRISMA_CLIENT_FACTORY");
export const PRISMA_CLIENT_DISCONNECT = Symbol("PRISMA_CLIENT_DISCONNECT");

export type PrismaClientFactory = () => PrismaClientInstance;
export type PrismaClientDisconnect = () => Promise<void>;
