import { NotImplementedException } from "@nestjs/common";
import { AuthService } from "../auth.service.js";

describe("AuthService", () => {
  const service = new AuthService();

  it("keeps email verification unimplemented in the skeleton", () => {
    expect(() => service.verifyEmail({ token: "placeholder-token" })).toThrow(
      NotImplementedException,
    );
  });

  it("keeps password reset unimplemented in the skeleton", () => {
    expect(() => service.requestPasswordReset({ email: "sarah@example.com" })).toThrow(
      NotImplementedException,
    );
  });
});
