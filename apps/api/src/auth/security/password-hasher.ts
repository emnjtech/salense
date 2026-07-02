export interface PasswordHasher {
  hashPassword(plainTextPassword: string): Promise<string>;
  comparePassword(plainTextPassword: string, passwordHash: string): Promise<boolean>;
}
