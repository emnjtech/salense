import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { PrismaService } from "../../database/prisma.service.js";
import type { BcryptPasswordHasherService } from "../../auth/security/index.js";
import type { JwtSessionConfigService, JwtSessionTokenService } from "../../auth/session/index.js";
import { PlatformAdminAuthService } from "../platform-admin-auth.service.js";

const activeAdmin = {
  email: "admin@salense.local",
  firstName: "Salense",
  id: "admin_1",
  lastLoginAt: null,
  lastName: "Admin",
  passwordHash: "hashed-password",
  role: "SUPER_ADMIN",
  status: "ACTIVE",
} as const;

function createServiceMocks() {
  const findAdminUnique = jest.fn();
  const updateAdmin = jest.fn();
  const createRefreshToken = jest.fn();
  const findRefreshToken = jest.fn();
  const updateRefreshToken = jest.fn();
  const updateManyRefreshTokens = jest.fn();
  const comparePassword = jest.fn();
  const hashPassword = jest.fn();
  const issueAccessToken = jest.fn();
  const issueRefreshToken = jest.fn();
  const verifyRefreshToken = jest.fn();
  const hashRefreshToken = jest.fn();
  const getRefreshTokenExpiryDate = jest.fn();
  const getRequiredAccessTokenConfig = jest.fn();
  const getRequiredConfig = jest.fn();
  const transaction = jest.fn(async (callback: (client: unknown) => Promise<unknown>) =>
    callback({
      platformAdmin: { update: updateAdmin },
      platformAdminRefreshToken: { updateMany: updateManyRefreshTokens },
    }),
  );
  const service = new PlatformAdminAuthService(
    {
      client: {
        $transaction: transaction,
        platformAdmin: {
          findUnique: findAdminUnique,
          update: updateAdmin,
        },
        platformAdminRefreshToken: {
          create: createRefreshToken,
          findUnique: findRefreshToken,
          update: updateRefreshToken,
          updateMany: updateManyRefreshTokens,
        },
      },
    } as unknown as PrismaService,
    { comparePassword, hashPassword } as unknown as BcryptPasswordHasherService,
    {
      getRefreshTokenExpiryDate,
      hashRefreshToken,
      issueAccessToken,
      issueRefreshToken,
      verifyRefreshToken,
    } as unknown as JwtSessionTokenService,
    { getRequiredAccessTokenConfig, getRequiredConfig } as unknown as JwtSessionConfigService,
  );

  return {
    comparePassword,
    createRefreshToken,
    findAdminUnique,
    getRefreshTokenExpiryDate,
    getRequiredAccessTokenConfig,
    getRequiredConfig,
    hashPassword,
    hashRefreshToken,
    issueAccessToken,
    issueRefreshToken,
    service,
    transaction,
    updateAdmin,
    updateManyRefreshTokens,
    verifyRefreshToken,
  };
}

describe("PlatformAdminAuthService", () => {
  it("logs in an active platform admin with database-backed identity", async () => {
    const mocks = createServiceMocks();
    mocks.findAdminUnique.mockResolvedValue(activeAdmin);
    mocks.comparePassword.mockResolvedValue(true);
    mocks.issueAccessToken.mockResolvedValue("admin.access.jwt");
    mocks.issueRefreshToken.mockResolvedValue("admin.refresh.jwt");
    mocks.hashRefreshToken.mockReturnValue("hashed-refresh-token");
    mocks.getRefreshTokenExpiryDate.mockReturnValue(new Date("2026-07-13T10:00:00.000Z"));
    mocks.getRequiredConfig.mockReturnValue({
      accessTokenExpiresIn: "15m",
      accessTokenSecret: "access-secret",
      refreshTokenExpiresIn: "7d",
      refreshTokenSecret: "refresh-secret",
    });

    await expect(
      mocks.service.login({ email: "ADMIN@SALENSE.LOCAL", password: "AdminPassword123!" }),
    ).resolves.toMatchObject({
      admin: {
        email: "admin@salense.local",
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      },
      accessToken: "admin.access.jwt",
      refreshToken: "admin.refresh.jwt",
    });
    expect(mocks.issueAccessToken).toHaveBeenCalledWith({
      email: "admin@salense.local",
      emailVerified: true,
      platformRole: "SUPER_ADMIN",
      sessionKind: "PLATFORM_ADMIN",
      sub: "admin_1",
    });
    expect(mocks.createRefreshToken).toHaveBeenCalledWith({
      data: {
        expiresAt: new Date("2026-07-13T10:00:00.000Z"),
        platformAdminId: "admin_1",
        tokenHash: "hashed-refresh-token",
      },
    });
  });

  it("rejects wrong platform admin passwords", async () => {
    const mocks = createServiceMocks();
    mocks.findAdminUnique.mockResolvedValue(activeAdmin);
    mocks.comparePassword.mockResolvedValue(false);

    await expect(
      mocks.service.login({ email: "admin@salense.local", password: "wrong" }),
    ).rejects.toThrow(UnauthorizedException);
    expect(mocks.issueAccessToken).not.toHaveBeenCalled();
  });

  it("blocks disabled platform admin accounts", async () => {
    const mocks = createServiceMocks();
    mocks.findAdminUnique.mockResolvedValue({ ...activeAdmin, status: "DISABLED" });

    await expect(
      mocks.service.login({ email: "admin@salense.local", password: "AdminPassword123!" }),
    ).rejects.toThrow(ForbiddenException);
    expect(mocks.comparePassword).not.toHaveBeenCalled();
  });

  it("changes the admin password and revokes active admin refresh tokens", async () => {
    const mocks = createServiceMocks();
    mocks.findAdminUnique.mockResolvedValue(activeAdmin);
    mocks.comparePassword.mockResolvedValue(true);
    mocks.hashPassword.mockResolvedValue("new-hashed-password");

    await expect(
      mocks.service.changePassword("admin_1", {
        confirmNewPassword: "NewAdminPassword123!",
        currentPassword: "AdminPassword123!",
        newPassword: "NewAdminPassword123!",
      }),
    ).resolves.toEqual({ passwordChanged: true });
    expect(mocks.updateAdmin).toHaveBeenCalledWith({
      where: { id: "admin_1" },
      data: { passwordHash: "new-hashed-password" },
    });
    expect(mocks.updateManyRefreshTokens).toHaveBeenCalledWith({
      where: {
        platformAdminId: "admin_1",
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
