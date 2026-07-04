import { EmailVerificationTokenService } from "../email-verification-token.service.js";

describe("EmailVerificationTokenService", () => {
  it("generates unique cryptographically random verification tokens", () => {
    const service = new EmailVerificationTokenService();

    const firstToken = service.generateToken();
    const secondToken = service.generateToken();

    expect(firstToken).toHaveLength(43);
    expect(secondToken).toHaveLength(43);
    expect(firstToken).not.toBe(secondToken);
  });

  it("hashes tokens without returning plaintext", () => {
    const service = new EmailVerificationTokenService();

    const hash = service.hashToken("raw-verification-token");

    expect(hash).not.toBe("raw-verification-token");
    expect(hash).toHaveLength(64);
    expect(service.hashToken("raw-verification-token")).toBe(hash);
  });

  it("creates default expiry dates", () => {
    const service = new EmailVerificationTokenService();
    const now = new Date("2026-07-02T12:00:00.000Z");

    expect(service.getExpiryDate(now)).toEqual(new Date("2026-07-03T12:00:00.000Z"));
  });
});