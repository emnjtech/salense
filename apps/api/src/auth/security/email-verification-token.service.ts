import { createHash, randomBytes } from "crypto";
import { Injectable } from "@nestjs/common";

const DEFAULT_EMAIL_VERIFICATION_EXPIRES_IN_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class EmailVerificationTokenService {
  generateToken(): string {
    return randomBytes(32).toString("base64url");
  }

  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  getExpiryDate(now: Date = new Date()): Date {
    return new Date(now.getTime() + DEFAULT_EMAIL_VERIFICATION_EXPIRES_IN_MS);
  }
}