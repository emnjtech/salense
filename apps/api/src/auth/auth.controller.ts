import { Body, Controller, Inject, NotImplementedException, Post } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { EmailVerificationRequestDto } from "./dto/email-verification-request.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { LoginRequestDto } from "./dto/login-request.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { PasswordResetRequestDto } from "./dto/password-reset-request.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { RegisterRequestDto } from "./dto/register-request.dto.js";
import { AuthService } from "./auth.service.js";
import type { RegistrationResponse } from "./types/registration-response.type.js";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() registerRequest: RegisterRequestDto): Promise<RegistrationResponse> {
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
