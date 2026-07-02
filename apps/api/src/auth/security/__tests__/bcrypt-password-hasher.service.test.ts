import { BcryptPasswordHasherService } from "../bcrypt-password-hasher.service.js";

describe("BcryptPasswordHasherService", () => {
  const password = "SecurePass123!";
  const service = new BcryptPasswordHasherService({ saltRounds: 4 });

  it("hashes passwords without returning plaintext", async () => {
    const hash = await service.hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash).toContain("$2");
  });

  it("matches the original password against its hash", async () => {
    const hash = await service.hashPassword(password);

    await expect(service.comparePassword(password, hash)).resolves.toBe(true);
  });

  it("rejects the wrong password against a hash", async () => {
    const hash = await service.hashPassword(password);

    await expect(service.comparePassword("WrongPass123!", hash)).resolves.toBe(false);
  });
});
