import { ConflictException, NotImplementedException } from "@nestjs/common";
import type { PrismaService } from "../../database/prisma.service.js";
import type { BcryptPasswordHasherService } from "../security/index.js";
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
} {
  const findUnique = jest.fn();
  const create = jest.fn();
  const hashPassword = jest.fn();
  const prismaService = {
    client: {
      user: {
        findUnique,
        create,
      },
    },
  } as unknown as PrismaService;
  const passwordHasher = {
    hashPassword,
  } as unknown as BcryptPasswordHasherService;

  return {
    service: new AuthService(prismaService, passwordHasher),
    findUnique,
    create,
    hashPassword,
  };
}

describe("AuthService", () => {
  it("creates a user and business during registration", async () => {
    const { service, findUnique, create, hashPassword } = createAuthServiceMocks();
    findUnique.mockResolvedValue(null);
    hashPassword.mockResolvedValue("hashed-password");
    create.mockResolvedValue({
      id: "user_1",
      firstName: "Sarah",
      lastName: "Owner",
      email: "sarah@example.com",
      emailVerified: false,
      businesses: [{ id: "business_1", name: "Example Company" }],
    });

    const response = await service.register(registerRequest);

    expect(findUnique).toHaveBeenCalledWith({ where: { email: "sarah@example.com" } });
    expect(hashPassword).toHaveBeenCalledWith("Password123!");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: "Sarah",
          lastName: "Owner",
          email: "sarah@example.com",
          passwordHash: "hashed-password",
          emailVerified: false,
          businesses: { create: { name: "Example Company" } },
        }),
      }),
    );
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

  it("stores a password hash instead of the plaintext password", async () => {
    const { service, findUnique, create, hashPassword } = createAuthServiceMocks();
    findUnique.mockResolvedValue(null);
    hashPassword.mockResolvedValue("hashed-password");
    create.mockResolvedValue({
      id: "user_1",
      firstName: "Sarah",
      lastName: "Owner",
      email: "sarah@example.com",
      emailVerified: false,
      businesses: [{ id: "business_1", name: "Example Company" }],
    });

    await service.register(registerRequest);

    expect(create.mock.calls[0][0].data.passwordHash).toBe("hashed-password");
    expect(create.mock.calls[0][0].data.passwordHash).not.toBe(registerRequest.password);
  });

  it("excludes sensitive fields from the registration response", async () => {
    const { service, findUnique, create, hashPassword } = createAuthServiceMocks();
    findUnique.mockResolvedValue(null);
    hashPassword.mockResolvedValue("hashed-password");
    create.mockResolvedValue({
      id: "user_1",
      firstName: "Sarah",
      lastName: "Owner",
      email: "sarah@example.com",
      emailVerified: false,
      businesses: [{ id: "business_1", name: "Example Company" }],
    });

    const response = await service.register(registerRequest);

    expect(JSON.stringify(response)).not.toContain("hashed-password");
    expect(JSON.stringify(response)).not.toContain(registerRequest.password);
    expect(JSON.stringify(response)).not.toContain("token");
  });

  it("keeps email verification unimplemented in the skeleton", () => {
    const { service } = createAuthServiceMocks();

    expect(() => service.verifyEmail({ token: "placeholder-token" })).toThrow(
      NotImplementedException,
    );
  });

  it("keeps password reset unimplemented in the skeleton", () => {
    const { service } = createAuthServiceMocks();

    expect(() => service.requestPasswordReset({ email: "sarah@example.com" })).toThrow(
      NotImplementedException,
    );
  });
});
