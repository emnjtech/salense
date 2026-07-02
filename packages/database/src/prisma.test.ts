import {
  createPrismaClient,
  disconnectPrismaClient,
  getPrismaClient,
  PrismaClient,
} from "./index.js";
import type { PrismaClientInstance, PrismaClientOptions } from "./index.js";

describe("database package exports", () => {
  it("exports Prisma client helpers without requiring a database connection", () => {
    expect(typeof createPrismaClient).toBe("function");
    expect(typeof getPrismaClient).toBe("function");
    expect(typeof disconnectPrismaClient).toBe("function");
    expect(typeof PrismaClient).toBe("function");
  });

  it("exposes reusable Prisma client types for application packages", () => {
    const options: PrismaClientOptions = undefined;
    const client: PrismaClientInstance | undefined = undefined;

    expect(options).toBeUndefined();
    expect(client).toBeUndefined();
  });
});
