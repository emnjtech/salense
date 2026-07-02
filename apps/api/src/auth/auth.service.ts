import { Injectable, NotImplementedException } from "@nestjs/common";
import type { EmailVerificationRequestDto } from "./dto/email-verification-request.dto.js";
import type { LoginRequestDto } from "./dto/login-request.dto.js";
import type { PasswordResetRequestDto } from "./dto/password-reset-request.dto.js";
import type { RegisterRequestDto } from "./dto/register-request.dto.js";

@Injectable()
export class AuthService {
  register(registerRequest: RegisterRequestDto): never {
    void registerRequest;
    throw new NotImplementedException("Registration is not implemented in the Phase 1 skeleton.");
  }

  login(loginRequest: LoginRequestDto): never {
    void loginRequest;
    throw new NotImplementedException("Login is not implemented in the Phase 1 skeleton.");
  }

  verifyEmail(emailVerificationRequest: EmailVerificationRequestDto): never {
    void emailVerificationRequest;
    throw new NotImplementedException(
      "Email verification is not implemented in the Phase 1 skeleton.",
    );
  }

  requestPasswordReset(passwordResetRequest: PasswordResetRequestDto): never {
    void passwordResetRequest;
    throw new NotImplementedException("Password reset is not implemented in the Phase 1 skeleton.");
  }
}
