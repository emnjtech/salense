import { PasswordResetTokenService } from "../password-reset-token.service.js";

describe("PasswordResetTokenService", () => {
  it("generates unique cryptographically random reset tokens", () => {
    const service = new PasswordResetTokenService();

    const firstToken = service.generateToken();
    const secondToken = service.generateToken();

    expect(firstToken).toHaveLength(43);
    expect(secondToken).toHaveLength(43);
    expect(firstToken).not.toBe(secondToken);
  });

  it("hashes reset tokens without returning plaintext", () => {
    const service = new PasswordResetTokenService();

    const hash = service.hashToken("raw-reset-token");

    expect(hash).not.toBe("raw-reset-token");
    expect(hash).toHaveLength(64);
    expect(service.hashToken("raw-reset-token")).toBe(hash);
  });
it("creates default expiry dates", () => {
  const service = new PasswordResetTokenService();
  const now = new Date("2026-07-02T12:00:00.000Z");

  expect(service.getExpiryDate(now)).toEqual(new Date("2026-07-02T13:00:00.000Z"));
});
 
});
