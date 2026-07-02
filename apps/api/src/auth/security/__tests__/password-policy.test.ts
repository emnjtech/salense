import { isPasswordPolicyCompliant, validatePasswordPolicy } from "../password-policy.js";

describe("password policy validation", () => {
  it("accepts a password that satisfies Chapter 6.1 requirements", () => {
    const result = validatePasswordPolicy("SecurePass123!");

    expect(result).toEqual({ isValid: true, violations: [] });
    expect(isPasswordPolicyCompliant("SecurePass123!")).toBe(true);
  });

  it("rejects passwords that miss Chapter 6.1 requirements", () => {
    const result = validatePasswordPolicy("weak");

    expect(result.isValid).toBe(false);
    expect(result.violations).toEqual(["minLength", "uppercase", "number", "specialCharacter"]);
    expect(isPasswordPolicyCompliant("weak")).toBe(false);
  });
});
