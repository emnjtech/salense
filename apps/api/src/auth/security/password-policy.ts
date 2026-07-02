export const PASSWORD_MIN_LENGTH = 12;

export type PasswordPolicyViolation =
  | "minLength"
  | "uppercase"
  | "lowercase"
  | "number"
  | "specialCharacter";

export interface PasswordPolicyValidationResult {
  readonly isValid: boolean;
  readonly violations: readonly PasswordPolicyViolation[];
}

const PASSWORD_POLICY_CHECKS: readonly {
  readonly violation: PasswordPolicyViolation;
  readonly isSatisfied: (password: string) => boolean;
}[] = [
  { violation: "minLength", isSatisfied: (password) => password.length >= PASSWORD_MIN_LENGTH },
  { violation: "uppercase", isSatisfied: (password) => /[A-Z]/.test(password) },
  { violation: "lowercase", isSatisfied: (password) => /[a-z]/.test(password) },
  { violation: "number", isSatisfied: (password) => /[0-9]/.test(password) },
  { violation: "specialCharacter", isSatisfied: (password) => /[^A-Za-z0-9]/.test(password) },
];

export function validatePasswordPolicy(password: string): PasswordPolicyValidationResult {
  const violations = PASSWORD_POLICY_CHECKS.filter((check) => !check.isSatisfied(password)).map(
    (check) => check.violation,
  );

  return {
    isValid: violations.length === 0,
    violations,
  };
}

export function isPasswordPolicyCompliant(password: string): boolean {
  return validatePasswordPolicy(password).isValid;
}
