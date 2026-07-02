import { NotImplementedException } from "@nestjs/common";
import { AuthController } from "../auth.controller.js";
import { AuthService } from "../auth.service.js";

describe("AuthController", () => {
  const authService = new AuthService();
  const controller = new AuthController(authService);

  it("does not pretend registration is implemented", () => {
    expect(() =>
      controller.register({
        firstName: "Sarah",
        lastName: "Owner",
        email: "sarah@example.com",
        password: "Password123!",
        confirmPassword: "Password123!",
        companyName: "Example Company",
      }),
    ).toThrow(NotImplementedException);
  });

  it("does not pretend login is implemented", () => {
    expect(() =>
      controller.login({
        email: "sarah@example.com",
        password: "Password123!",
      }),
    ).toThrow(NotImplementedException);
  });
});
