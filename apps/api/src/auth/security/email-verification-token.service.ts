import { createHash, randomBytes } from "crypto";
import { Injectable } from "@nestjs/common";

export interface EmailVerificationTokenOptions {
  readonly expiresInMs: number;
}

const DEFAULT_EMAIL_VERIFICATION_EXPIRES_IN_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class EmailVerificationTokenService {
  constructor(
    private readonly options: EmailVerificationTokenOptions = {
      expiresInMs: DEFAULT_EMAIL_VERIFICATION_EXPIRES_IN_MS,
    },
  ) {}

  generateToken(): string {
    return randomBytes(32).toString("base64url");
  }

  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  getExpiryDate(now: Date = new Date()): Date {
    return new Date(now.getTime() + this.options.expiresInMs);
  }
}
