import { UnauthorizedException, ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import type { Server } from "node:http";
import type { Test as HttpRequest } from "supertest";
import { PrismaService } from "../../database/prisma.service.js";
import { EmailService } from "../../email/email.service.js";
import {
  BcryptPasswordHasherService,
  EmailVerificationTokenService,
  PasswordResetTokenService,
} from "../security/index.js";
import { JwtSessionConfigService, JwtSessionTokenService } from "../session/index.js";
import { AuthModule } from "../auth.module.js";

type HttpMethod = "post" | "put";

interface ContractCase {
  readonly body: Record<string, unknown>;
  readonly method: HttpMethod;
  readonly notImplementedMessage: string;
  readonly path: string;
}

const prismaClient = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  emailVerificationToken: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  passwordResetToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};
const passwordHasher = {
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
};
const emailVerificationTokens = {
  generateToken: jest.fn(),
  hashToken: jest.fn(),
  getExpiryDate: jest.fn(),
};
const passwordResetTokens = {
  generateToken: jest.fn(),
  hashToken: jest.fn(),
  getExpiryDate: jest.fn(),
};
const emailService = {
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
};
const jwtSessionTokens = {
  issueAccessToken: jest.fn(),
  verifyAccessToken: jest.fn(),
};
const jwtSessionConfig = {
  getRequiredAccessTokenConfig: jest.fn(),
};

async function createContractApp(): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({
    imports: [AuthModule],
  })
    .overrideProvider(PrismaService)
    .useValue({ client: prismaClient })
    .overrideProvider(BcryptPasswordHasherService)
    .useValue(passwordHasher)
    .overrideProvider(EmailVerificationTokenService)
    .useValue(emailVerificationTokens)
    .overrideProvider(PasswordResetTokenService)
    .useValue(passwordResetTokens)
    .overrideProvider(EmailService)
    .useValue(emailService)
    .overrideProvider(JwtSessionTokenService)
    .useValue(jwtSessionTokens)
    .overrideProvider(JwtSessionConfigService)
    .useValue(jwtSessionConfig)
    .compile();

  const app = testingModule.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  await app.init();

  return app;
}

function sendRequest(
  server: Server,
  contract: Omit<ContractCase, "notImplementedMessage">,
): HttpRequest {
  const agent = request(server);

  if (contract.method === "post") {
    return agent.post(contract.path).send(contract.body);
  }

  return agent.put(contract.path).send(contract.body);
}

async function withContractApp(assertion: (server: Server) => Promise<void>): Promise<void> {
  const app = await createContractApp();
  const server = app.getHttpServer() as Server;

  try {
    await assertion(server);
  } finally {
    await app.close();
  }
}

const registrationBody = {
  firstName: "Sarah",
  lastName: "Owner",
  email: "SARAH@example.com",
  password: "Password123!",
  confirmPassword: "Password123!",
  companyName: "Example Company",
};

const unimplementedContracts = [
  {
    method: "put",
    path: "/users/company-profile",
    body: {
      businessName: "Example Company",
      businessLogoUrl: "https://example.com/logo.png",
      country: "GB",
      timeZone: "Europe/London",
      currency: "GBP",
      taxPreference: "standard",
      industry: "E-commerce",
    },
    notImplementedMessage: "Company profile management is not implemented in the Phase 1 skeleton.",
  },
] as const satisfies readonly ContractCase[];

const invalidContracts = [
  {
    method: "post",
    path: "/auth/register",
    body: {
      firstName: "",
      lastName: "Owner",
      email: "not-an-email",
      password: "weak",
      confirmPassword: "",
      companyName: "",
    },
  },
  {
    method: "post",
    path: "/auth/login",
    body: {
      email: "not-an-email",
      password: "",
    },
  },
  {
    method: "post",
    path: "/auth/email-verification",
    body: {
      token: "",
    },
  },
  {
    method: "post",
    path: "/auth/password-reset",
    body: {
      email: "not-an-email",
    },
  },
  {
    method: "post",
    path: "/auth/password-reset/confirm",
    body: {
      token: "",
      password: "weak",
      confirmPassword: "",
    },
  },
  {
    method: "put",
    path: "/users/company-profile",
    body: {
      businessName: "",
      country: "United Kingdom",
      timeZone: "",
      currency: "Pounds",
      taxPreference: "",
      industry: "",
    },
  },
] as const satisfies readonly Omit<ContractCase, "notImplementedMessage">[];

describe("Phase 1 authentication and user management controller contracts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaClient.$transaction.mockImplementation(
      async (callback: (client: unknown) => Promise<unknown>) => callback(prismaClient),
    );
  });

  it("post /auth/login returns an access token for a verified user", async () => {
    prismaClient.user.findUnique.mockResolvedValue({
      id: "user_1",
      email: "sarah@example.com",
      passwordHash: "hashed-password",
      emailVerified: true,
    });
    passwordHasher.comparePassword.mockResolvedValue(true);
    jwtSessionTokens.issueAccessToken.mockResolvedValue("access.jwt.token");
    jwtSessionConfig.getRequiredAccessTokenConfig.mockReturnValue({
      accessTokenSecret: "access-secret",
      accessTokenExpiresIn: "15m",
    });

    await withContractApp(async (server) => {
      const response = await sendRequest(server, {
        method: "post",
        path: "/auth/login",
        body: { email: "SARAH@example.com", password: "Password123!" },
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        user: {
          id: "user_1",
          email: "sarah@example.com",
          emailVerified: true,
        },
        accessToken: "access.jwt.token",
        accessTokenExpiresIn: "15m",
      });
      expect(response.body.session).toBeUndefined();
      expect(response.body.refreshToken).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain("password");
      expect(JSON.stringify(response.body)).not.toContain("refreshToken");
      expect(JSON.stringify(response.body)).not.toContain("session");
      expect(prismaClient.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: "sarah@example.com" } }),
      );
      expect(passwordHasher.comparePassword).toHaveBeenCalledWith(
        "Password123!",
        "hashed-password",
      );
      expect(jwtSessionTokens.issueAccessToken).toHaveBeenCalledWith({
        sub: "user_1",
        email: "sarah@example.com",
        emailVerified: true,
      });
    });
  });

  it("post /auth/register route creates a safe registration response", async () => {
    prismaClient.user.findUnique.mockResolvedValue(null);
    passwordHasher.hashPassword.mockResolvedValue("hashed-password");
    emailVerificationTokens.generateToken.mockReturnValue("raw-verification-token");
    emailVerificationTokens.hashToken.mockReturnValue("hashed-verification-token");
    emailVerificationTokens.getExpiryDate.mockReturnValue(new Date("2026-07-03T12:00:00.000Z"));
    prismaClient.user.create.mockResolvedValue({
      id: "user_1",
      firstName: "Sarah",
      lastName: "Owner",
      email: "sarah@example.com",
      emailVerified: false,
      businesses: [{ id: "business_1", name: "Example Company" }],
    });

    await withContractApp(async (server) => {
      const response = await sendRequest(server, {
        method: "post",
        path: "/auth/register",
        body: registrationBody,
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        user: {
          id: "user_1",
          firstName: "Sarah",
          lastName: "Owner",
          email: "sarah@example.com",
          emailVerified: false,
        },
        business: { id: "business_1", name: "Example Company" },
      });
      expect(JSON.stringify(response.body)).not.toContain("password");
      expect(JSON.stringify(response.body)).not.toContain("token");
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith({
        email: "sarah@example.com",
        firstName: "Sarah",
        verificationToken: "raw-verification-token",
      });
    });
  });

  it("post /auth/email-verification verifies a valid token and does not return token data", async () => {
    emailVerificationTokens.hashToken.mockReturnValue("hashed-verification-token");
    prismaClient.emailVerificationToken.findUnique.mockResolvedValue({
      id: "verification_token_1",
      userId: "user_1",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    });

    await withContractApp(async (server) => {
      const response = await sendRequest(server, {
        method: "post",
        path: "/auth/email-verification",
        body: { token: "raw-verification-token" },
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ emailVerified: true });
      expect(JSON.stringify(response.body)).not.toContain("raw-verification-token");
      expect(JSON.stringify(response.body)).not.toContain("hashed-verification-token");
      expect(prismaClient.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user_1" },
          data: expect.objectContaining({ emailVerified: true }),
        }),
      );
      expect(prismaClient.emailVerificationToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "verification_token_1" },
          data: expect.objectContaining({ usedAt: expect.any(Date) }),
        }),
      );
    });
  });

  it("post /auth/password-reset creates a reset token for an existing email", async () => {
    prismaClient.user.findUnique.mockResolvedValue({
      id: "user_1",
      email: "sarah@example.com",
      firstName: "Sarah",
    });
    passwordResetTokens.generateToken.mockReturnValue("raw-reset-token");
    passwordResetTokens.hashToken.mockReturnValue("hashed-reset-token");
    passwordResetTokens.getExpiryDate.mockReturnValue(new Date("2026-07-03T12:00:00.000Z"));

    await withContractApp(async (server) => {
      const response = await sendRequest(server, {
        method: "post",
        path: "/auth/password-reset",
        body: { email: "SARAH@example.com" },
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ passwordResetRequested: true });
      expect(response.body.emailExists).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain("raw-reset-token");
      expect(JSON.stringify(response.body)).not.toContain("hashed-reset-token");
      expect(prismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: "sarah@example.com" },
        select: { id: true, firstName: true, email: true },
      });
      expect(prismaClient.passwordResetToken.create).toHaveBeenCalledWith({
        data: {
          userId: "user_1",
          tokenHash: "hashed-reset-token",
          expiresAt: new Date("2026-07-03T12:00:00.000Z"),
        },
      });
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith({
        email: "sarah@example.com",
        firstName: "Sarah",
        resetToken: "raw-reset-token",
      });
    });
  });

  it("post /auth/password-reset returns the same generic response for a missing email", async () => {
    prismaClient.user.findUnique.mockResolvedValue(null);

    await withContractApp(async (server) => {
      const response = await sendRequest(server, {
        method: "post",
        path: "/auth/password-reset",
        body: { email: "missing@example.com" },
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ passwordResetRequested: true });
      expect(response.body.emailExists).toBeUndefined();
      expect(prismaClient.passwordResetToken.create).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  it("post /auth/password-reset/confirm updates the password and invalidates the token", async () => {
    passwordResetTokens.hashToken.mockReturnValue("hashed-reset-token");
    prismaClient.passwordResetToken.findUnique.mockResolvedValue({
      id: "reset_token_1",
      userId: "user_1",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    });
    passwordHasher.hashPassword.mockResolvedValue("new-hashed-password");

    await withContractApp(async (server) => {
      const response = await sendRequest(server, {
        method: "post",
        path: "/auth/password-reset/confirm",
        body: {
          token: "raw-reset-token",
          password: "NewPassword123!",
          confirmPassword: "NewPassword123!",
        },
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ passwordReset: true });
      expect(JSON.stringify(response.body)).not.toContain("raw-reset-token");
      expect(JSON.stringify(response.body)).not.toContain("new-hashed-password");
      expect(prismaClient.passwordResetToken.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: "hashed-reset-token" },
        select: { id: true, userId: true, expiresAt: true, usedAt: true },
      });
      expect(prismaClient.user.update).toHaveBeenCalledWith({
        where: { id: "user_1" },
        data: { passwordHash: "new-hashed-password" },
      });
      expect(prismaClient.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: "reset_token_1" },
        data: { usedAt: expect.any(Date) },
      });
    });
  });

  it("post /auth/password-reset/confirm rejects invalid reset tokens", async () => {
    passwordResetTokens.hashToken.mockReturnValue("hashed-reset-token");
    prismaClient.passwordResetToken.findUnique.mockResolvedValue(null);

    await withContractApp(async (server) => {
      const response = await sendRequest(server, {
        method: "post",
        path: "/auth/password-reset/confirm",
        body: {
          token: "raw-reset-token",
          password: "NewPassword123!",
          confirmPassword: "NewPassword123!",
        },
      });

      expect(response.status).toBe(404);
      expect(passwordHasher.hashPassword).not.toHaveBeenCalled();
    });
  });

  it("post /auth/password-reset/confirm rejects expired reset tokens", async () => {
    passwordResetTokens.hashToken.mockReturnValue("hashed-reset-token");
    prismaClient.passwordResetToken.findUnique.mockResolvedValue({
      id: "reset_token_1",
      userId: "user_1",
      expiresAt: new Date(Date.now() - 60_000),
      usedAt: null,
    });

    await withContractApp(async (server) => {
      const response = await sendRequest(server, {
        method: "post",
        path: "/auth/password-reset/confirm",
        body: {
          token: "raw-reset-token",
          password: "NewPassword123!",
          confirmPassword: "NewPassword123!",
        },
      });

      expect(response.status).toBe(400);
      expect(passwordHasher.hashPassword).not.toHaveBeenCalled();
    });
  });

  it("post /auth/password-reset/confirm rejects reused reset tokens", async () => {
    passwordResetTokens.hashToken.mockReturnValue("hashed-reset-token");
    prismaClient.passwordResetToken.findUnique.mockResolvedValue({
      id: "reset_token_1",
      userId: "user_1",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: new Date(),
    });

    await withContractApp(async (server) => {
      const response = await sendRequest(server, {
        method: "post",
        path: "/auth/password-reset/confirm",
        body: {
          token: "raw-reset-token",
          password: "NewPassword123!",
          confirmPassword: "NewPassword123!",
        },
      });

      expect(response.status).toBe(404);
      expect(passwordHasher.hashPassword).not.toHaveBeenCalled();
    });
  });

  it("get /auth/me returns the current user for a valid access token", async () => {
    jwtSessionTokens.verifyAccessToken.mockResolvedValue({
      sub: "user_1",
      email: "sarah@example.com",
      emailVerified: true,
    });
    prismaClient.user.findUnique.mockResolvedValue({
      id: "user_1",
      email: "sarah@example.com",
      firstName: "Sarah",
      lastName: "Owner",
      emailVerified: true,
      passwordHash: "hashed-password",
    });

    await withContractApp(async (server) => {
      const response = await request(server)
        .get("/auth/me")
        .set("Authorization", "Bearer access.jwt.token");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: "user_1",
        email: "sarah@example.com",
        firstName: "Sarah",
        lastName: "Owner",
        emailVerified: true,
      });
      expect(jwtSessionTokens.verifyAccessToken).toHaveBeenCalledWith("access.jwt.token");
      expect(prismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user_1" },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          emailVerified: true,
        },
      });
      expect(JSON.stringify(response.body)).not.toContain("password");
      expect(JSON.stringify(response.body)).not.toContain("passwordHash");
      expect(JSON.stringify(response.body)).not.toContain("access.jwt.token");
    });
  });

  it("get /auth/me rejects a missing access token", async () => {
    await withContractApp(async (server) => {
      const response = await request(server).get("/auth/me");

      expect(response.status).toBe(401);
      expect(jwtSessionTokens.verifyAccessToken).not.toHaveBeenCalled();
    });
  });

  it("get /auth/me rejects an invalid access token", async () => {
    jwtSessionTokens.verifyAccessToken.mockRejectedValue(
      new UnauthorizedException("JWT access token is invalid."),
    );

    await withContractApp(async (server) => {
      const response = await request(server)
        .get("/auth/me")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(401);
    });
  });

  it("get /auth/me rejects an expired access token", async () => {
    jwtSessionTokens.verifyAccessToken.mockRejectedValue(
      new UnauthorizedException("JWT access token has expired."),
    );

    await withContractApp(async (server) => {
      const response = await request(server)
        .get("/auth/me")
        .set("Authorization", "Bearer expired-token");

      expect(response.status).toBe(401);
    });
  });

  it("get /auth/me rejects a valid token for a missing user", async () => {
    jwtSessionTokens.verifyAccessToken.mockResolvedValue({
      sub: "deleted_user",
      email: "deleted@example.com",
      emailVerified: true,
    });
    prismaClient.user.findUnique.mockResolvedValue(null);

    await withContractApp(async (server) => {
      const response = await request(server)
        .get("/auth/me")
        .set("Authorization", "Bearer access.jwt.token");

      expect(response.status).toBe(401);
    });
  });

  it.each(unimplementedContracts)(
    "$method $path route exists and returns explicit NotImplementedException",
    async (contract) => {
      await withContractApp(async (server) => {
        const response = await sendRequest(server, contract);

        expect(response.status).toBe(501);
        expect(response.body).toMatchObject({
          error: "Not Implemented",
          message: contract.notImplementedMessage,
          statusCode: 501,
        });
      });
    },
  );

  it.each(invalidContracts)("$method $path rejects invalid request bodies", async (contract) => {
    await withContractApp(async (server) => {
      const response = await sendRequest(server, contract);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: "Bad Request",
        statusCode: 400,
      });
    });
  });
});
