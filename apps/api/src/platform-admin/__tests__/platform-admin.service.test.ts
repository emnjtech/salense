import { BadRequestException } from "@nestjs/common";
import type { PrismaService } from "../../database/prisma.service.js";
import type { BcryptPasswordHasherService } from "../../auth/security/index.js";
import { PlatformAdminService } from "../platform-admin.service.js";

function createServiceMocks() {
  const upsert = jest.fn();
  const hashPassword = jest.fn();
  const service = new PlatformAdminService(
    {
      client: {
        platformAdmin: {
          upsert,
        },
      },
    } as unknown as PrismaService,
    { hashPassword } as unknown as BcryptPasswordHasherService,
  );

  return { hashPassword, service, upsert };
}

describe("PlatformAdminService", () => {
  it("creates or updates a platform admin through the shared password hasher", async () => {
    const mocks = createServiceMocks();
    mocks.hashPassword.mockResolvedValue("hashed-password");
    mocks.upsert.mockResolvedValue({
      email: "admin@salense.local",
      id: "admin_1",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    });

    await expect(
      mocks.service.createPlatformAdmin({
        email: " ADMIN@SALENSE.LOCAL ",
        firstName: " Salense ",
        lastName: " Admin ",
        password: "AdminPassword123!",
      }),
    ).resolves.toEqual({
      email: "admin@salense.local",
      id: "admin_1",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    });
    expect(mocks.hashPassword).toHaveBeenCalledWith("AdminPassword123!");
    expect(mocks.upsert).toHaveBeenCalledWith({
      where: { email: "admin@salense.local" },
      update: {
        firstName: "Salense",
        lastName: "Admin",
        passwordHash: "hashed-password",
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      },
      create: {
        email: "admin@salense.local",
        firstName: "Salense",
        lastName: "Admin",
        passwordHash: "hashed-password",
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      },
      select: {
        email: true,
        id: true,
        role: true,
        status: true,
      },
    });
  });

  it("rejects weak admin passwords before hashing", async () => {
    const mocks = createServiceMocks();

    await expect(
      mocks.service.createPlatformAdmin({
        email: "admin@salense.local",
        firstName: "Salense",
        lastName: "Admin",
        password: "weak",
      }),
    ).rejects.toThrow(BadRequestException);
    expect(mocks.hashPassword).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
