import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Injectable, InternalServerErrorException } from "@nestjs/common";

export interface EncryptedCredentialPlaceholder {
  readonly ciphertext: string;
  readonly iv: string;
  readonly authTag: string;
  readonly algorithm: "aes-256-gcm";
  readonly keyId: string;
}

export interface CredentialEncryptionService {
  encrypt(plaintext: string): EncryptedCredentialPlaceholder;
  decrypt(encryptedCredential: EncryptedCredentialPlaceholder): string;
}

const algorithm = "aes-256-gcm";

@Injectable()
export class AesCredentialEncryptionService implements CredentialEncryptionService {
  constructor(
    private readonly base64Key = process.env.SALENSE_CREDENTIAL_ENCRYPTION_KEY,
    private readonly keyId = process.env.SALENSE_CREDENTIAL_ENCRYPTION_KEY_ID ?? "default",
  ) {}

  encrypt(plaintext: string): EncryptedCredentialPlaceholder {
    const key = this.getKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv(algorithm, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

    return {
      algorithm,
      authTag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64"),
      iv: iv.toString("base64"),
      keyId: this.keyId,
    };
  }

  decrypt(encryptedCredential: EncryptedCredentialPlaceholder): string {
    const key = this.getKey();
    const decipher = createDecipheriv(
      encryptedCredential.algorithm,
      key,
      Buffer.from(encryptedCredential.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(encryptedCredential.authTag, "base64"));

    return Buffer.concat([
      decipher.update(Buffer.from(encryptedCredential.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }

  private getKey(): Buffer {
    if (!this.base64Key) {
      throw new InternalServerErrorException("Credential encryption is not configured.");
    }

    const key = Buffer.from(this.base64Key, "base64");

    if (key.length !== 32) {
      throw new InternalServerErrorException("Credential encryption key must be 32 bytes.");
    }

    return key;
  }
}
