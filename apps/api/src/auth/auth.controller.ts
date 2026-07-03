import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { ChangePasswordRequestDto } from "./dto/change-password-request.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { EmailVerificationRequestDto } from "./dto/email-verification-request.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { LoginRequestDto } from "./dto/login-request.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { LogoutRequestDto } from "./dto/logout-request.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { PasswordResetConfirmationRequestDto } from "./dto/password-reset-confirmation-request.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { PasswordResetRequestDto } from "./dto/password-reset-request.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { RefreshSessionRequestDto } from "./dto/refresh-session-request.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { RegisterRequestDto } from "./dto/register-request.dto.js";
import { JwtAccessTokenGuard, type AuthenticatedRequest } from "./guards/jwt-access-token.guard.js";
import { AuthService } from "./auth.service.js";
import type { ChangePasswordResponse } from "./types/change-password-response.type.js";
import type { CurrentUserResponse } from "./types/current-user-response.type.js";
import type { EmailVerificationResponse } from "./types/email-verification-response.type.js";
import type { LoginSessionResponse } from "./types/login-session-response.type.js";
import type { LogoutResponse } from "./types/logout-response.type.js";
import type {
  PasswordResetConfirmationResponse,
  PasswordResetRequestResponse,
} from "./types/password-reset-response.type.js";
import type { RefreshSessionResponse } from "./types/refresh-session-response.type.js";
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

  @Post("refresh")
  @HttpCode(200)
  refreshSession(
    @Body() refreshSessionRequest: RefreshSessionRequestDto,
  ): Promise<RefreshSessionResponse> {
    return this.authService.refreshSession(refreshSessionRequest);
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

  @Post("change-password")
  @HttpCode(200)
  @UseGuards(JwtAccessTokenGuard)
  changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() changePasswordRequest: ChangePasswordRequestDto,
  ): Promise<ChangePasswordResponse> {
    const userId = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException("Authenticated request context is not available.");
    }

    return this.authService.changePassword(userId, changePasswordRequest);
  }

  @Post("logout")
  @HttpCode(200)
  logout(@Body() logoutRequest: LogoutRequestDto): Promise<LogoutResponse> {
    return this.authService.logout(logoutRequest);
  }
}
