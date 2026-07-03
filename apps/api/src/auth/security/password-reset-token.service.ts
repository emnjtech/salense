import { createHash, randomBytes } from "crypto";
import { Injectable } from "@nestjs/common";

export interface PasswordResetTokenOptions {
  readonly expiresInMs: number;
}

const DEFAULT_PASSWORD_RESET_EXPIRES_IN_MS = 60 * 60 * 1000;

@Injectable()
export class PasswordResetTokenService {
  constructor(
    private readonly options: PasswordResetTokenOptions = {
      expiresInMs: DEFAULT_PASSWORD_RESET_EXPIRES_IN_MS,
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
