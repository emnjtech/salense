import { Body, Controller, Inject, NotImplementedException, Post } from "@nestjs/common";
import type { EmailVerificationRequestDto } from "./dto/email-verification-request.dto.js";
import type { LoginRequestDto } from "./dto/login-request.dto.js";
import type { PasswordResetRequestDto } from "./dto/password-reset-request.dto.js";
import type { RegisterRequestDto } from "./dto/register-request.dto.js";
import { AuthService } from "./auth.service.js";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() registerRequest: RegisterRequestDto): never {
    return this.authService.register(registerRequest);
  }

  @Post("login")
  login(@Body() loginRequest: LoginRequestDto): never {
    return this.authService.login(loginRequest);
  }

  @Post("email-verification")
  verifyEmail(@Body() emailVerificationRequest: EmailVerificationRequestDto): never {
    return this.authService.verifyEmail(emailVerificationRequest);
  }

  @Post("password-reset")
  requestPasswordReset(@Body() passwordResetRequest: PasswordResetRequestDto): never {
    return this.authService.requestPasswordReset(passwordResetRequest);
  }

  @Post("logout")
  logout(): never {
    throw new NotImplementedException("Logout is not implemented in the Phase 1 skeleton.");
  }
}
