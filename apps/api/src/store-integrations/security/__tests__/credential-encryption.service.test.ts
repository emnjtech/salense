import { InternalServerErrorException } from "@nestjs/common";
import { AesCredentialEncryptionService } from "../credential-encryption.service.js";

const testKey = Buffer.alloc(32, 7).toString("base64");

describe("AesCredentialEncryptionService", () => {
  it("encrypts and decrypts credential placeholders when configured", () => {
    const service = new AesCredentialEncryptionService(testKey, "test-key");

    const encryptedCredential = service.encrypt("woocommerce-secret");

    expect(encryptedCredential.ciphertext).not.toBe("woocommerce-secret");
    expect(encryptedCredential.keyId).toBe("test-key");
    expect(service.decrypt(encryptedCredential)).toBe("woocommerce-secret");
  });

  it("fails safely when encryption config is missing", () => {
    const previousKey = process.env.SALENSE_CREDENTIAL_ENCRYPTION_KEY;

    delete process.env.SALENSE_CREDENTIAL_ENCRYPTION_KEY;

    try {
      const service = new AesCredentialEncryptionService();

      expect(() => service.encrypt("woocommerce-secret")).toThrow(InternalServerErrorException);
    } finally {
      if (previousKey === undefined) {
        delete process.env.SALENSE_CREDENTIAL_ENCRYPTION_KEY;
      } else {
        process.env.SALENSE_CREDENTIAL_ENCRYPTION_KEY = previousKey;
      }
    }
  });
});
