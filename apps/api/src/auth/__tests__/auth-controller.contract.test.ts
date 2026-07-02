import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import type { Server } from "node:http";
import type { Test as HttpRequest } from "supertest";
import { PrismaService } from "../../database/prisma.service.js";
import { EmailService } from "../../email/email.service.js";
import { BcryptPasswordHasherService, EmailVerificationTokenService } from "../security/index.js";
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
const emailService = {
  sendVerificationEmail: jest.fn(),
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
    .overrideProvider(EmailService)
    .useValue(emailService)
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
    method: "post",
    path: "/auth/password-reset",
    body: {
      email: "sarah@example.com",
    },
    notImplementedMessage: "Password reset is not implemented in the Phase 1 skeleton.",
  },
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

  it("post /auth/login returns a safe eligibility response for a verified user", async () => {
    prismaClient.user.findUnique.mockResolvedValue({
      id: "user_1",
      email: "sarah@example.com",
      passwordHash: "hashed-password",
      emailVerified: true,
    });
    passwordHasher.comparePassword.mockResolvedValue(true);

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
      });
      expect(JSON.stringify(response.body)).not.toContain("password");
      expect(JSON.stringify(response.body)).not.toContain("token");
      expect(JSON.stringify(response.body)).not.toContain("session");
      expect(prismaClient.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: "sarah@example.com" } }),
      );
      expect(passwordHasher.comparePassword).toHaveBeenCalledWith(
        "Password123!",
        "hashed-password",
      );
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
