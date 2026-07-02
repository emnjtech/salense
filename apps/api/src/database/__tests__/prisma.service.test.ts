import type { PrismaClientInstance } from "@salense/database";
import { PrismaService } from "../prisma.service.js";

describe("PrismaService", () => {
  it("lazily exposes the shared Prisma client", () => {
    const client = { $disconnect: jest.fn() } as unknown as PrismaClientInstance;
    const getSharedClient = jest.fn(() => client);
    const disconnectSharedClient = jest.fn(async () => undefined);
    const service = new PrismaService(getSharedClient, disconnectSharedClient);

    expect(getSharedClient).not.toHaveBeenCalled();
    expect(service.client).toBe(client);
    expect(getSharedClient).toHaveBeenCalledTimes(1);
  });

  it("disconnects the shared client during application shutdown", async () => {
    const getSharedClient = jest.fn(() => ({}) as PrismaClientInstance);
    const disconnectSharedClient = jest.fn(async () => undefined);
    const service = new PrismaService(getSharedClient, disconnectSharedClient);

    await service.onApplicationShutdown();

    expect(disconnectSharedClient).toHaveBeenCalledTimes(1);
    expect(getSharedClient).not.toHaveBeenCalled();
  });
});
