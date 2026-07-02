import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import type { Server } from "node:http";
import type { Test as HttpRequest } from "supertest";
import { PrismaService } from "../../database/prisma.service.js";
import { BcryptPasswordHasherService } from "../security/index.js";
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
  },
};
const passwordHasher = {
  hashPassword: jest.fn(),
};

async function createContractApp(): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({
    imports: [AuthModule],
  })
    .overrideProvider(PrismaService)
    .useValue({ client: prismaClient })
    .overrideProvider(BcryptPasswordHasherService)
    .useValue(passwordHasher)
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
    path: "/auth/login",
    body: {
      email: "sarah@example.com",
      password: "Password123!",
    },
    notImplementedMessage: "Login is not implemented in the Phase 1 skeleton.",
  },
  {
    method: "post",
    path: "/auth/email-verification",
    body: {
      token: "verification-token",
    },
    notImplementedMessage: "Email verification is not implemented in the Phase 1 skeleton.",
  },
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
  });

  it("post /auth/register route creates a safe registration response", async () => {
    prismaClient.user.findUnique.mockResolvedValue(null);
    passwordHasher.hashPassword.mockResolvedValue("hashed-password");
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
