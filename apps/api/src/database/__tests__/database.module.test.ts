import { Test } from "@nestjs/testing";
import { DatabaseModule } from "../database.module.js";
import { PrismaService } from "../prisma.service.js";

describe("DatabaseModule", () => {
  it("provides PrismaService without opening a database connection", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [DatabaseModule] }).compile();

    try {
      expect(moduleRef.get(PrismaService)).toBeInstanceOf(PrismaService);
    } finally {
      await moduleRef.close();
    }
  });
});
