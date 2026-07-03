import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type { PrismaService } from "../../database/prisma.service.js";
import type { EmailService } from "../../email/email.service.js";
import type {
  BcryptPasswordHasherService,
  EmailVerificationTokenService,
  PasswordResetTokenService,
} from "../security/index.js";
import type { JwtSessionConfigService, JwtSessionTokenService } from "../session/index.js";
import { AuthService } from "../auth.service.js";

const registerRequest = {
  firstName: "Sarah",
  lastName: "Owner",
  email: "SARAH@EXAMPLE.COM",
  password: "Password123!",
  confirmPassword: "Password123!",
  companyName: "Example Company",
};

function createAuthServiceMocks(): {
  readonly service: AuthService;
  readonly findUnique: jest.Mock;
  readonly create: jest.Mock;
  readonly hashPassword: jest.Mock;
  readonly comparePassword: jest.Mock;
  readonly generateToken: jest.Mock;
  readonly hashToken: jest.Mock;
  readonly getExpiryDate: jest.Mock;
  readonly generatePasswordResetToken: jest.Mock;
  readonly hashPasswordResetToken: jest.Mock;
  readonly getPasswordResetExpiryDate: jest.Mock;
  readonly sendVerificationEmail: jest.Mock;
  readonly sendPasswordResetEmail: jest.Mock;
  readonly findVerificationToken: jest.Mock;
  readonly createPasswordResetToken: jest.Mock;
  readonly findPasswordResetToken: jest.Mock;
  readonly updateUser: jest.Mock;
  readonly updateVerificationToken: jest.Mock;
  readonly updatePasswordResetToken: jest.Mock;
  readonly createRefreshToken: jest.Mock;
  readonly findRefreshToken: jest.Mock;
  readonly updateRefreshToken: jest.Mock;
  readonly transaction: jest.Mock;
  readonly issueAccessToken: jest.Mock;
  readonly issueRefreshToken: jest.Mock;
  readonly verifyRefreshToken: jest.Mock;
  readonly hashRefreshToken: jest.Mock;
  readonly getRefreshTokenExpiryDate: jest.Mock;
  readonly getRequiredAccessTokenConfig: jest.Mock;
  readonly getRequiredConfig: jest.Mock;
} {
  const findUnique = jest.fn();
  const create = jest.fn();
  const hashPassword = jest.fn();
  const comparePassword = jest.fn();
  const generateToken = jest.fn();
  const hashToken = jest.fn();
  const getExpiryDate = jest.fn();
  const generatePasswordResetToken = jest.fn();
  const hashPasswordResetToken = jest.fn();
  const getPasswordResetExpiryDate = jest.fn();
  const sendVerificationEmail = jest.fn();
  const sendPasswordResetEmail = jest.fn();
  const findVerificationToken = jest.fn();
  const createPasswordResetToken = jest.fn();
  const findPasswordResetToken = jest.fn();
  const updateUser = jest.fn();
  const updateVerificationToken = jest.fn();
  const updatePasswordResetToken = jest.fn();
  const createRefreshToken = jest.fn();
  const findRefreshToken = jest.fn();
  const updateRefreshToken = jest.fn();
  const issueAccessToken = jest.fn();
  const issueRefreshToken = jest.fn();
  const verifyRefreshToken = jest.fn();
  const hashRefreshToken = jest.fn();
  const getRefreshTokenExpiryDate = jest.fn();
  const getRequiredAccessTokenConfig = jest.fn();
  const getRequiredConfig = jest.fn();
  const transaction = jest.fn(async (callback: (client: unknown) => Promise<unknown>) =>
    callback({
      user: { update: updateUser },
      emailVerificationToken: { update: updateVerificationToken },
      passwordResetToken: { update: updatePasswordResetToken },
      refreshToken: { update: updateRefreshToken },
    }),
  );
  const prismaService = {
    client: {
      user: {
        findUnique,
        create,
        update: updateUser,
      },
      emailVerificationToken: {
        findUnique: findVerificationToken,
        update: updateVerificationToken,
      },
      passwordResetToken: {
        create: createPasswordResetToken,
        findUnique: findPasswordResetToken,
        update: updatePasswordResetToken,
      },
      refreshToken: {
        create: createRefreshToken,
        findUnique: findRefreshToken,
        update: updateRefreshToken,
      },
      $transaction: transaction,
    },
  } as unknown as PrismaService;
  const passwordHasher = {
    hashPassword,
    comparePassword,
  } as unknown as BcryptPasswordHasherService;
  const tokenService = {
    generateToken,
    hashToken,
    getExpiryDate,
  } as unknown as EmailVerificationTokenService;
  const passwordResetTokenService = {
    generateToken: generatePasswordResetToken,
    hashToken: hashPasswordResetToken,
    getExpiryDate: getPasswordResetExpiryDate,
  } as unknown as PasswordResetTokenService;
  const emailService = { sendVerificationEmail, sendPasswordResetEmail } as unknown as EmailService;
  const jwtSessionTokens = {
    issueAccessToken,
    issueRefreshToken,
    verifyRefreshToken,
    hashRefreshToken,
    getRefreshTokenExpiryDate,
  } as unknown as JwtSessionTokenService;
  const jwtSessionConfig = {
    getRequiredAccessTokenConfig,
    getRequiredConfig,
  } as unknown as JwtSessionConfigService;

  return {
    service: new AuthService(
      prismaService,
      passwordHasher,
      tokenService,
      passwordResetTokenService,
      emailService,
      jwtSessionTokens,
      jwtSessionConfig,
    ),
    findUnique,
    create,
    hashPassword,
    comparePassword,
    generateToken,
    hashToken,
    getExpiryDate,
    generatePasswordResetToken,
    hashPasswordResetToken,
    getPasswordResetExpiryDate,
    sendVerificationEmail,
    sendPasswordResetEmail,
    findVerificationToken,
    createPasswordResetToken,
    findPasswordResetToken,
    updateUser,
    updateVerificationToken,
    updatePasswordResetToken,
    createRefreshToken,
    findRefreshToken,
    updateRefreshToken,
    transaction,
    issueAccessToken,
    issueRefreshToken,
    verifyRefreshToken,
    hashRefreshToken,
    getRefreshTokenExpiryDate,
    getRequiredAccessTokenConfig,
    getRequiredConfig,
  };
}

function mockCreatedUser(create: jest.Mock): void {
  create.mockResolvedValue({
    id: "user_1",
    firstName: "Sarah",
    lastName: "Owner",
    email: "sarah@example.com",
    emailVerified: false,
    businesses: [{ id: "business_1", name: "Example Company" }],
  });
}

describe("AuthService", () => {
  it("creates a user, business, and hashed verification token during registration", async () => {
    const mocks = createAuthServiceMocks();
    mocks.findUnique.mockResolvedValue(null);
    mocks.hashPassword.mockResolvedValue("hashed-password");
    mocks.generateToken.mockReturnValue("raw-verification-token");
    mocks.hashToken.mockReturnValue("hashed-verification-token");
    mocks.getExpiryDate.mockReturnValue(new Date("2026-07-03T12:00:00.000Z"));
    mockCreatedUser(mocks.create);

    const response = await mocks.service.register(registerRequest);

    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { email: "sarah@example.com" } });
    expect(mocks.hashPassword).toHaveBeenCalledWith("Password123!");
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "sarah@example.com",
          passwordHash: "hashed-password",
          emailVerified: false,
          businesses: { create: { name: "Example Company" } },
          emailVerificationTokens: {
            create: {
              tokenHash: "hashed-verification-token",
              expiresAt: new Date("2026-07-03T12:00:00.000Z"),
            },
          },
        }),
      }),
    );
    expect(mocks.sendVerificationEmail).toHaveBeenCalledWith({
      email: "sarah@example.com",
      firstName: "Sarah",
      verificationToken: "raw-verification-token",
    });
    expect(response).toEqual({
      user: {
        id: "user_1",
        firstName: "Sarah",
        lastName: "Owner",
        email: "sarah@example.com",
        emailVerified: false,
      },
      business: { id: "business_1", name: "Example Company" },
    });
  });

  it("rejects duplicate registration emails", async () => {
    const { service, findUnique, create, hashPassword } = createAuthServiceMocks();
    findUnique.mockResolvedValue({ id: "existing_user" });

    await expect(service.register(registerRequest)).rejects.toThrow(ConflictException);
    expect(hashPassword).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("excludes sensitive fields from the registration response", async () => {
    const mocks = createAuthServiceMocks();
    mocks.findUnique.mockResolvedValue(null);
    mocks.hashPassword.mockResolvedValue("hashed-password");
    mocks.generateToken.mockReturnValue("raw-verification-token");
    mocks.hashToken.mockReturnValue("hashed-verification-token");
    mocks.getExpiryDate.mockReturnValue(new Date("2026-07-03T12:00:00.000Z"));
    mockCreatedUser(mocks.create);

    const response = await mocks.service.register(registerRequest);

    expect(JSON.stringify(response)).not.toContain("hashed-password");
    expect(JSON.stringify(response)).not.toContain(registerRequest.password);
    expect(JSON.stringify(response)).not.toContain("raw-verification-token");
    expect(JSON.stringify(response)).not.toContain("hashed-verification-token");
  });

  it("marks a user verified and invalidates a valid token", async () => {
    const mocks = createAuthServiceMocks();
    mocks.hashToken.mockReturnValue("hashed-token");
    mocks.findVerificationToken.mockResolvedValue({
      id: "token_1",
      userId: "user_1",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    });

    await expect(mocks.service.verifyEmail({ token: "raw-token" })).resolves.toEqual({
      emailVerified: true,
    });

    expect(mocks.findVerificationToken).toHaveBeenCalledWith({
      where: { tokenHash: "hashed-token" },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.updateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user_1" },
        data: expect.objectContaining({ emailVerified: true }),
      }),
    );
    expect(mocks.updateVerificationToken).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "token_1" },
        data: expect.objectContaining({ usedAt: expect.any(Date) }),
      }),
    );
  });

  it("rejects an expired verification token", async () => {
    const mocks = createAuthServiceMocks();
    mocks.hashToken.mockReturnValue("hashed-token");
    mocks.findVerificationToken.mockResolvedValue({
      id: "token_1",
      userId: "user_1",
      expiresAt: new Date(Date.now() - 60_000),
      usedAt: null,
    });

    await expect(mocks.service.verifyEmail({ token: "raw-token" })).rejects.toThrow(
      BadRequestException,
    );
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects an invalid verification token", async () => {
    const mocks = createAuthServiceMocks();
    mocks.hashToken.mockReturnValue("hashed-token");
    mocks.findVerificationToken.mockResolvedValue(null);

    await expect(mocks.service.verifyEmail({ token: "raw-token" })).rejects.toThrow(
      NotFoundException,
    );
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("prevents verification token reuse", async () => {
    const mocks = createAuthServiceMocks();
    mocks.hashToken.mockReturnValue("hashed-token");
    mocks.findVerificationToken.mockResolvedValue({
      id: "token_1",
      userId: "user_1",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: new Date(),
    });

    await expect(mocks.service.verifyEmail({ token: "raw-token" })).rejects.toThrow(
      NotFoundException,
    );
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("issues access and refresh tokens for a verified user with a matching password", async () => {
    const mocks = createAuthServiceMocks();
    mocks.findUnique.mockResolvedValue({
      id: "user_1",
      email: "sarah@example.com",
      passwordHash: "hashed-password",
      emailVerified: true,
    });
    mocks.comparePassword.mockResolvedValue(true);
    mocks.issueAccessToken.mockResolvedValue("access.jwt.token");
    mocks.issueRefreshToken.mockResolvedValue("refresh.jwt.token");
    mocks.hashRefreshToken.mockReturnValue("hashed-refresh-token");
    mocks.getRefreshTokenExpiryDate.mockReturnValue(new Date("2026-08-02T12:00:00.000Z"));
    mocks.getRequiredConfig.mockReturnValue({
      accessTokenSecret: "access-secret",
      refreshTokenSecret: "refresh-secret",
      accessTokenExpiresIn: "15m",
      refreshTokenExpiresIn: "30d",
    });

    await expect(
      mocks.service.login({ email: "SARAH@EXAMPLE.COM", password: "Password123!" }),
    ).resolves.toEqual({
      user: {
        id: "user_1",
        email: "sarah@example.com",
        emailVerified: true,
      },
      accessToken: "access.jwt.token",
      accessTokenExpiresIn: "15m",
      refreshToken: "refresh.jwt.token",
      refreshTokenExpiresIn: "30d",
    });

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { email: "sarah@example.com" },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        emailVerified: true,
      },
    });
    expect(mocks.comparePassword).toHaveBeenCalledWith("Password123!", "hashed-password");
    expect(mocks.issueAccessToken).toHaveBeenCalledWith({
      sub: "user_1",
      email: "sarah@example.com",
      emailVerified: true,
    });
    expect(mocks.issueRefreshToken).toHaveBeenCalledWith({
      sub: "user_1",
      email: "sarah@example.com",
      emailVerified: true,
    });
    expect(mocks.createRefreshToken).toHaveBeenCalledWith({
      data: {
        userId: "user_1",
        tokenHash: "hashed-refresh-token",
        expiresAt: new Date("2026-08-02T12:00:00.000Z"),
      },
    });
  });

  it("blocks login eligibility for an unverified user", async () => {
    const mocks = createAuthServiceMocks();
    mocks.findUnique.mockResolvedValue({
      id: "user_1",
      email: "sarah@example.com",
      passwordHash: "hashed-password",
      emailVerified: false,
    });
    mocks.comparePassword.mockResolvedValue(true);

    await expect(
      mocks.service.login({ email: "sarah@example.com", password: "Password123!" }),
    ).rejects.toThrow(ForbiddenException);
    expect(mocks.issueAccessToken).not.toHaveBeenCalled();
  });

  it("rejects login eligibility when the user does not exist", async () => {
    const mocks = createAuthServiceMocks();
    mocks.findUnique.mockResolvedValue(null);

    await expect(
      mocks.service.login({ email: "missing@example.com", password: "Password123!" }),
    ).rejects.toThrow(UnauthorizedException);
    expect(mocks.comparePassword).not.toHaveBeenCalled();
  });

  it("rejects login eligibility when the password is incorrect", async () => {
    const mocks = createAuthServiceMocks();
    mocks.findUnique.mockResolvedValue({
      id: "user_1",
      email: "sarah@example.com",
      passwordHash: "hashed-password",
      emailVerified: true,
    });
    mocks.comparePassword.mockResolvedValue(false);

    await expect(
      mocks.service.login({ email: "sarah@example.com", password: "WrongPass123!" }),
    ).rejects.toThrow(UnauthorizedException);
    expect(mocks.issueAccessToken).not.toHaveBeenCalled();
  });

  it("fails login safely when JWT access token config is missing", async () => {
    const mocks = createAuthServiceMocks();
    mocks.findUnique.mockResolvedValue({
      id: "user_1",
      email: "sarah@example.com",
      passwordHash: "hashed-password",
      emailVerified: true,
    });
    mocks.comparePassword.mockResolvedValue(true);
    mocks.issueAccessToken.mockRejectedValue(new Error("Missing JWT config."));

    await expect(
      mocks.service.login({ email: "sarah@example.com", password: "Password123!" }),
    ).rejects.toThrow("Missing JWT config.");
  });

  it("excludes sensitive fields from the login response", async () => {
    const mocks = createAuthServiceMocks();
    mocks.findUnique.mockResolvedValue({
      id: "user_1",
      email: "sarah@example.com",
      passwordHash: "hashed-password",
      emailVerified: true,
    });
    mocks.comparePassword.mockResolvedValue(true);
    mocks.issueAccessToken.mockResolvedValue("access.jwt.token");
    mocks.issueRefreshToken.mockResolvedValue("refresh.jwt.token");
    mocks.hashRefreshToken.mockReturnValue("hashed-refresh-token");
    mocks.getRefreshTokenExpiryDate.mockReturnValue(new Date("2026-08-02T12:00:00.000Z"));
    mocks.getRequiredConfig.mockReturnValue({
      accessTokenSecret: "access-secret",
      refreshTokenSecret: "refresh-secret",
      accessTokenExpiresIn: "15m",
      refreshTokenExpiresIn: "30d",
    });

    const response = await mocks.service.login({
      email: "sarah@example.com",
      password: "Password123!",
    });

    expect(JSON.stringify(response)).not.toContain("hashed-password");
    expect(JSON.stringify(response)).not.toContain("hashed-refresh-token");
    expect(JSON.stringify(response)).not.toContain("Password123!");
    expect(JSON.stringify(response)).not.toContain("session");
  });

  it("refreshes a valid stored refresh token with a new access token", async () => {
    const mocks = createAuthServiceMocks();
    mocks.verifyRefreshToken.mockResolvedValue({
      sub: "user_1",
      email: "sarah@example.com",
      emailVerified: true,
    });
    mocks.hashRefreshToken.mockReturnValue("hashed-refresh-token");
    mocks.findRefreshToken.mockResolvedValue({
      id: "refresh_token_1",
      userId: "user_1",
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    });
    mocks.findUnique.mockResolvedValue({
      id: "user_1",
      email: "sarah@example.com",
      emailVerified: true,
    });
    mocks.issueAccessToken.mockResolvedValue("new.access.jwt.token");
    mocks.getRequiredAccessTokenConfig.mockReturnValue({
      accessTokenSecret: "access-secret",
      accessTokenExpiresIn: "15m",
    });

    await expect(
      mocks.service.refreshSession({ refreshToken: "refresh.jwt.token" }),
    ).resolves.toEqual({
      user: {
        id: "user_1",
        email: "sarah@example.com",
        emailVerified: true,
      },
      accessToken: "new.access.jwt.token",
      accessTokenExpiresIn: "15m",
    });
    expect(mocks.findRefreshToken).toHaveBeenCalledWith({
      where: { tokenHash: "hashed-refresh-token" },
      select: { id: true, userId: true, expiresAt: true, revokedAt: true },
    });
  });

  it("rejects an invalid refresh token", async () => {
    const mocks = createAuthServiceMocks();
    mocks.verifyRefreshToken.mockResolvedValue({
      sub: "user_1",
      email: "sarah@example.com",
      emailVerified: true,
    });
    mocks.hashRefreshToken.mockReturnValue("hashed-refresh-token");
    mocks.findRefreshToken.mockResolvedValue(null);

    await expect(
      mocks.service.refreshSession({ refreshToken: "refresh.jwt.token" }),
    ).rejects.toThrow(UnauthorizedException);
    expect(mocks.issueAccessToken).not.toHaveBeenCalled();
  });

  it("rejects an expired stored refresh token", async () => {
    const mocks = createAuthServiceMocks();
    mocks.verifyRefreshToken.mockResolvedValue({
      sub: "user_1",
      email: "sarah@example.com",
      emailVerified: true,
    });
    mocks.hashRefreshToken.mockReturnValue("hashed-refresh-token");
    mocks.findRefreshToken.mockResolvedValue({
      id: "refresh_token_1",
      userId: "user_1",
      expiresAt: new Date(Date.now() - 60_000),
      revokedAt: null,
    });

    await expect(
      mocks.service.refreshSession({ refreshToken: "refresh.jwt.token" }),
    ).rejects.toThrow(UnauthorizedException);
    expect(mocks.issueAccessToken).not.toHaveBeenCalled();
  });

  it("rejects a revoked refresh token", async () => {
    const mocks = createAuthServiceMocks();
    mocks.verifyRefreshToken.mockResolvedValue({
      sub: "user_1",
      email: "sarah@example.com",
      emailVerified: true,
    });
    mocks.hashRefreshToken.mockReturnValue("hashed-refresh-token");
    mocks.findRefreshToken.mockResolvedValue({
      id: "refresh_token_1",
      userId: "user_1",
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
    });

    await expect(
      mocks.service.refreshSession({ refreshToken: "refresh.jwt.token" }),
    ).rejects.toThrow(UnauthorizedException);
    expect(mocks.issueAccessToken).not.toHaveBeenCalled();
  });

  it("revokes a valid refresh token during logout", async () => {
    const mocks = createAuthServiceMocks();
    mocks.verifyRefreshToken.mockResolvedValue({
      sub: "user_1",
      email: "sarah@example.com",
      emailVerified: true,
    });
    mocks.hashRefreshToken.mockReturnValue("hashed-refresh-token");
    mocks.findRefreshToken.mockResolvedValue({
      id: "refresh_token_1",
      userId: "user_1",
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    });

    await expect(mocks.service.logout({ refreshToken: "refresh.jwt.token" })).resolves.toEqual({
      loggedOut: true,
    });
    expect(mocks.updateRefreshToken).toHaveBeenCalledWith({
      where: { id: "refresh_token_1" },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("returns the safe current user profile", async () => {
    const mocks = createAuthServiceMocks();
    mocks.findUnique.mockResolvedValue({
      id: "user_1",
      email: "sarah@example.com",
      firstName: "Sarah",
      lastName: "Owner",
      emailVerified: true,
      passwordHash: "hashed-password",
    });

    await expect(mocks.service.getCurrentUser("user_1")).resolves.toEqual({
      id: "user_1",
      email: "sarah@example.com",
      firstName: "Sarah",
      lastName: "Owner",
      emailVerified: true,
    });
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { id: "user_1" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        emailVerified: true,
      },
    });
  });

  it("rejects current user lookup when the token subject no longer exists", async () => {
    const mocks = createAuthServiceMocks();
    mocks.findUnique.mockResolvedValue(null);

    await expect(mocks.service.getCurrentUser("deleted_user")).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("creates a hashed password reset token for an existing email", async () => {
    const mocks = createAuthServiceMocks();
    mocks.findUnique.mockResolvedValue({
      id: "user_1",
      email: "sarah@example.com",
      firstName: "Sarah",
    });
    mocks.generatePasswordResetToken.mockReturnValue("raw-reset-token");
    mocks.hashPasswordResetToken.mockReturnValue("hashed-reset-token");
    mocks.getPasswordResetExpiryDate.mockReturnValue(new Date("2026-07-03T12:00:00.000Z"));

    await expect(
      mocks.service.requestPasswordReset({ email: "SARAH@EXAMPLE.COM" }),
    ).resolves.toEqual({
      passwordResetRequested: true,
    });

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { email: "sarah@example.com" },
      select: { id: true, firstName: true, email: true },
    });
    expect(mocks.createPasswordResetToken).toHaveBeenCalledWith({
      data: {
        userId: "user_1",
        tokenHash: "hashed-reset-token",
        expiresAt: new Date("2026-07-03T12:00:00.000Z"),
      },
    });
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith({
      email: "sarah@example.com",
      firstName: "Sarah",
      resetToken: "raw-reset-token",
    });
  });

  it("returns the same generic password reset request response for a missing email", async () => {
    const mocks = createAuthServiceMocks();
    mocks.findUnique.mockResolvedValue(null);

    await expect(
      mocks.service.requestPasswordReset({ email: "missing@example.com" }),
    ).resolves.toEqual({
      passwordResetRequested: true,
    });

    expect(mocks.createPasswordResetToken).not.toHaveBeenCalled();
    expect(mocks.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("updates the password hash and invalidates a valid password reset token", async () => {
    const mocks = createAuthServiceMocks();
    mocks.hashPasswordResetToken.mockReturnValue("hashed-reset-token");
    mocks.findPasswordResetToken.mockResolvedValue({
      id: "reset_token_1",
      userId: "user_1",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    });
    mocks.hashPassword.mockResolvedValue("new-hashed-password");

    await expect(
      mocks.service.confirmPasswordReset({
        token: "raw-reset-token",
        password: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      }),
    ).resolves.toEqual({ passwordReset: true });

    expect(mocks.findPasswordResetToken).toHaveBeenCalledWith({
      where: { tokenHash: "hashed-reset-token" },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });
    expect(mocks.hashPassword).toHaveBeenCalledWith("NewPassword123!");
    expect(mocks.updateUser).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { passwordHash: "new-hashed-password" },
    });
    expect(mocks.updatePasswordResetToken).toHaveBeenCalledWith({
      where: { id: "reset_token_1" },
      data: { usedAt: expect.any(Date) },
    });
  });

  it("rejects an invalid password reset token", async () => {
    const mocks = createAuthServiceMocks();
    mocks.hashPasswordResetToken.mockReturnValue("hashed-reset-token");
    mocks.findPasswordResetToken.mockResolvedValue(null);

    await expect(
      mocks.service.confirmPasswordReset({
        token: "raw-reset-token",
        password: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      }),
    ).rejects.toThrow(NotFoundException);
    expect(mocks.hashPassword).not.toHaveBeenCalled();
  });

  it("rejects an expired password reset token", async () => {
    const mocks = createAuthServiceMocks();
    mocks.hashPasswordResetToken.mockReturnValue("hashed-reset-token");
    mocks.findPasswordResetToken.mockResolvedValue({
      id: "reset_token_1",
      userId: "user_1",
      expiresAt: new Date(Date.now() - 60_000),
      usedAt: null,
    });

    await expect(
      mocks.service.confirmPasswordReset({
        token: "raw-reset-token",
        password: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      }),
    ).rejects.toThrow(BadRequestException);
    expect(mocks.hashPassword).not.toHaveBeenCalled();
  });

  it("prevents password reset token reuse", async () => {
    const mocks = createAuthServiceMocks();
    mocks.hashPasswordResetToken.mockReturnValue("hashed-reset-token");
    mocks.findPasswordResetToken.mockResolvedValue({
      id: "reset_token_1",
      userId: "user_1",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: new Date(),
    });

    await expect(
      mocks.service.confirmPasswordReset({
        token: "raw-reset-token",
        password: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      }),
    ).rejects.toThrow(NotFoundException);
    expect(mocks.hashPassword).not.toHaveBeenCalled();
  });

  it("rejects weak password reset confirmation passwords", async () => {
    const mocks = createAuthServiceMocks();

    await expect(
      mocks.service.confirmPasswordReset({
        token: "raw-reset-token",
        password: "weak",
        confirmPassword: "weak",
      }),
    ).rejects.toThrow(BadRequestException);
    expect(mocks.findPasswordResetToken).not.toHaveBeenCalled();
  });

  it("excludes sensitive fields from password reset responses", async () => {
    const mocks = createAuthServiceMocks();
    mocks.findUnique.mockResolvedValue({
      id: "user_1",
      email: "sarah@example.com",
      firstName: "Sarah",
    });
    mocks.generatePasswordResetToken.mockReturnValue("raw-reset-token");
    mocks.hashPasswordResetToken.mockReturnValue("hashed-reset-token");
    mocks.getPasswordResetExpiryDate.mockReturnValue(new Date("2026-07-03T12:00:00.000Z"));

    const response = await mocks.service.requestPasswordReset({ email: "sarah@example.com" });

    expect(JSON.stringify(response)).not.toContain("raw-reset-token");
    expect(JSON.stringify(response)).not.toContain("hashed-reset-token");
    expect(JSON.stringify(response)).not.toContain("NewPassword123!");
    expect(JSON.stringify(response)).not.toContain("passwordHash");
  });
});
