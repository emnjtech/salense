import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { EmailVerificationRequestDto } from "../dto/email-verification-request.dto.js";
import { LoginRequestDto } from "../dto/login-request.dto.js";
import { PasswordResetRequestDto } from "../dto/password-reset-request.dto.js";
import { RegisterRequestDto } from "../dto/register-request.dto.js";

async function validateDto<T extends object>(Dto: new () => T, payload: Record<string, unknown>) {
  return validate(plainToInstance(Dto, payload));
}

describe("authentication DTO validation", () => {
  it("accepts a Chapter 6.1 registration shape with a compliant password", async () => {
    const errors = await validateDto(RegisterRequestDto, {
      firstName: "Sarah",
      lastName: "Owner",
      email: "sarah@example.com",
      password: "Password123!",
      confirmPassword: "Password123!",
      companyName: "Example Company",
    });

    expect(errors).toHaveLength(0);
  });

  it("rejects weak registration passwords", async () => {
    const errors = await validateDto(RegisterRequestDto, {
      firstName: "Sarah",
      lastName: "Owner",
      email: "sarah@example.com",
      password: "weak",
      confirmPassword: "weak",
      companyName: "Example Company",
    });

    expect(errors.some((error) => error.property === "password")).toBe(true);
  });

  it("rejects malformed login email addresses", async () => {
    const errors = await validateDto(LoginRequestDto, {
      email: "not-an-email",
      password: "Password123!",
    });

    expect(errors.some((error) => error.property === "email")).toBe(true);
  });

  it("requires a password reset email", async () => {
    const errors = await validateDto(PasswordResetRequestDto, {});

    expect(errors.some((error) => error.property === "email")).toBe(true);
  });

  it("requires an email verification token", async () => {
    const errors = await validateDto(EmailVerificationRequestDto, { token: "" });

    expect(errors.some((error) => error.property === "token")).toBe(true);
  });
});
