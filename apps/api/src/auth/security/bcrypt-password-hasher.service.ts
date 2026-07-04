import { Injectable } from "@nestjs/common";
import bcrypt from "bcryptjs";
import type { PasswordHasher } from "./password-hasher.js";

const DEFAULT_BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class BcryptPasswordHasherService implements PasswordHasher {
  async hashPassword(plainTextPassword: string): Promise<string> {
    return bcrypt.hash(plainTextPassword, DEFAULT_BCRYPT_SALT_ROUNDS);
  }

  async comparePassword(plainTextPassword: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plainTextPassword, passwordHash);
  }
}