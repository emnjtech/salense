import { Injectable } from "@nestjs/common";
import bcrypt from "bcryptjs";
import type { PasswordHasher } from "./password-hasher.js";

export interface BcryptPasswordHasherOptions {
  readonly saltRounds: number;
}

const DEFAULT_BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class BcryptPasswordHasherService implements PasswordHasher {
  constructor(
    private readonly options: BcryptPasswordHasherOptions = {
      saltRounds: DEFAULT_BCRYPT_SALT_ROUNDS,
    },
  ) {}

  async hashPassword(plainTextPassword: string): Promise<string> {
    return bcrypt.hash(plainTextPassword, this.options.saltRounds);
  }

  async comparePassword(plainTextPassword: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plainTextPassword, passwordHash);
  }
}
