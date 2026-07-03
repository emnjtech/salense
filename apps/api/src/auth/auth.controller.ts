import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  NotImplementedException,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { EmailVerificationRequestDto } from "./dto/email-verification-request.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { LoginRequestDto } from "./dto/login-request.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { PasswordResetConfirmationRequestDto } from "./dto/password-reset-confirmation-request.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { PasswordResetRequestDto } from "./dto/password-reset-request.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { RegisterRequestDto } from "./dto/register-request.dto.js";
import { JwtAccessTokenGuard, type AuthenticatedRequest } from "./guards/jwt-access-token.guard.js";
import { AuthService } from "./auth.service.js";
import type { CurrentUserResponse } from "./types/current-user-response.type.js";
import type { EmailVerificationResponse } from "./types/email-verification-response.type.js";
import type { LoginSessionResponse } from "./types/login-session-response.type.js";
import type {
  PasswordResetConfirmationResponse,
  PasswordResetRequestResponse,
} from "./types/password-reset-response.type.js";
import type { RegistrationResponse } from "./types/registration-response.type.js";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() registerRequest: RegisterRequestDto): Promise<RegistrationResponse> {
    return this.authService.register(registerRequest);
  }

  @Post("login")
  @HttpCode(200)
  login(@Body() loginRequest: LoginRequestDto): Promise<LoginSessionResponse> {
    return this.authService.login(loginRequest);
  }

  @Post("email-verification")
  @HttpCode(200)
  verifyEmail(
    @Body() emailVerificationRequest: EmailVerificationRequestDto,
  ): Promise<EmailVerificationResponse> {
    return this.authService.verifyEmail(emailVerificationRequest);
  }

  @Post("password-reset")
  @HttpCode(200)
  requestPasswordReset(
    @Body() passwordResetRequest: PasswordResetRequestDto,
  ): Promise<PasswordResetRequestResponse> {
    return this.authService.requestPasswordReset(passwordResetRequest);
  }

  @Post("password-reset/confirm")
  @HttpCode(200)
  confirmPasswordReset(
    @Body() passwordResetConfirmationRequest: PasswordResetConfirmationRequestDto,
  ): Promise<PasswordResetConfirmationResponse> {
    return this.authService.confirmPasswordReset(passwordResetConfirmationRequest);
  }

  @Get("me")
  @UseGuards(JwtAccessTokenGuard)
  currentUser(@Req() request: AuthenticatedRequest): Promise<CurrentUserResponse> {
    const userId = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException("Authenticated request context is not available.");
    }

    return this.authService.getCurrentUser(userId);
  }

  @Post("logout")
  logout(): never {
    throw new NotImplementedException("Logout is not implemented in the Phase 1 skeleton.");
  }
}
