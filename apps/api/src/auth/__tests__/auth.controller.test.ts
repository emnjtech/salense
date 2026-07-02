import { NotImplementedException } from "@nestjs/common";
import { AuthController } from "../auth.controller.js";
import type { AuthService } from "../auth.service.js";

describe("AuthController", () => {
  const authService = {
    register: jest.fn(),
    login: jest.fn(),
  } as unknown as AuthService;
  const controller = new AuthController(authService);

  it("delegates registration to AuthService", async () => {
    const response = {
      user: {
        id: "user_1",
        firstName: "Sarah",
        lastName: "Owner",
        email: "sarah@example.com",
        emailVerified: false,
      },
      business: { id: "business_1", name: "Example Company" },
    };
    jest.mocked(authService.register).mockResolvedValueOnce(response);

    await expect(
      controller.register({
        firstName: "Sarah",
        lastName: "Owner",
        email: "sarah@example.com",
        password: "Password123!",
        confirmPassword: "Password123!",
        companyName: "Example Company",
      }),
    ).resolves.toBe(response);
  });

  it("does not pretend login is implemented", () => {
    jest.mocked(authService.login).mockImplementationOnce(() => {
      throw new NotImplementedException("Login is not implemented in the Phase 1 skeleton.");
    });

    expect(() =>
      controller.login({
        email: "sarah@example.com",
        password: "Password123!",
      }),
    ).toThrow(NotImplementedException);
  });
});
