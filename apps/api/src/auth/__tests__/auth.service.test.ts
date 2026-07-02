import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  NotImplementedException,
  UnauthorizedException,
} from "@nestjs/common";
import type { PrismaService } from "../../database/prisma.service.js";
import type { EmailService } from "../../email/email.service.js";
import type {
  BcryptPasswordHasherService,
  EmailVerificationTokenService,
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
  readonly sendVerificationEmail: jest.Mock;
  readonly findVerificationToken: jest.Mock;
  readonly updateUser: jest.Mock;
  readonly updateVerificationToken: jest.Mock;
  readonly transaction: jest.Mock;
  readonly issueAccessToken: jest.Mock;
  readonly getRequiredAccessTokenConfig: jest.Mock;
} {
  const findUnique = jest.fn();
  const create = jest.fn();
  const hashPassword = jest.fn();
  const comparePassword = jest.fn();
  const generateToken = jest.fn();
  const hashToken = jest.fn();
  const getExpiryDate = jest.fn();
  const sendVerificationEmail = jest.fn();
  const findVerificationToken = jest.fn();
  const updateUser = jest.fn();
  const updateVerificationToken = jest.fn();
  const issueAccessToken = jest.fn();
  const getRequiredAccessTokenConfig = jest.fn();
  const transaction = jest.fn(async (callback: (client: unknown) => Promise<unknown>) =>
    callback({
      user: { update: updateUser },
      emailVerificationToken: { update: updateVerificationToken },
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
  const emailService = { sendVerificationEmail } as unknown as EmailService;
  const jwtSessionTokens = { issueAccessToken } as unknown as JwtSessionTokenService;
  const jwtSessionConfig = {
    getRequiredAccessTokenConfig,
  } as unknown as JwtSessionConfigService;

  return {
    service: new AuthService(
      prismaService,
      passwordHasher,
      tokenService,
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
    sendVerificationEmail,
    findVerificationToken,
    updateUser,
    updateVerificationToken,
    transaction,
    issueAccessToken,
    getRequiredAccessTokenConfig,
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

  it("issues an access token for a verified user with a matching password", async () => {
    const mocks = createAuthServiceMocks();
    mocks.findUnique.mockResolvedValue({
      id: "user_1",
      email: "sarah@example.com",
      passwordHash: "hashed-password",
      emailVerified: true,
    });
    mocks.comparePassword.mockResolvedValue(true);
    mocks.issueAccessToken.mockResolvedValue("access.jwt.token");
    mocks.getRequiredAccessTokenConfig.mockReturnValue({
      accessTokenSecret: "access-secret",
      accessTokenExpiresIn: "15m",
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
    mocks.getRequiredAccessTokenConfig.mockReturnValue({
      accessTokenSecret: "access-secret",
      accessTokenExpiresIn: "15m",
    });

    const response = await mocks.service.login({
      email: "sarah@example.com",
      password: "Password123!",
    });

    expect(JSON.stringify(response)).not.toContain("hashed-password");
    expect(JSON.stringify(response)).not.toContain("Password123!");
    expect(JSON.stringify(response)).not.toContain("refreshToken");
    expect(JSON.stringify(response)).not.toContain("session");
  });

  it("keeps password reset unimplemented in the skeleton", () => {
    const { service } = createAuthServiceMocks();

    expect(() => service.requestPasswordReset({ email: "sarah@example.com" })).toThrow(
      NotImplementedException,
    );
  });
});
