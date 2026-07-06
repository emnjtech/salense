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
import { JwtAccessTokenGuard, type AuthenticatedRequest } from "../auth/guards/jwt-access-token.guard.js";
import { PlatformAdminGuard } from "../auth/guards/platform-admin.guard.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { ChangePasswordRequestDto } from "../auth/dto/change-password-request.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { PlatformAdminLoginRequestDto } from "./dto/platform-admin-login-request.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { PlatformAdminRefreshRequestDto } from "./dto/platform-admin-refresh-request.dto.js";
import { PlatformAdminAuthService } from "./platform-admin-auth.service.js";
import type {
  PlatformAdminProfileResponse,
  PlatformAdminRefreshResponse,
  PlatformAdminSessionResponse,
} from "./types/platform-admin-auth-response.type.js";

@Controller("platform-admin/auth")
export class PlatformAdminAuthController {
  constructor(
    @Inject(PlatformAdminAuthService)
    private readonly platformAdminAuthService: PlatformAdminAuthService,
  ) {}

  @Post("login")
  @HttpCode(200)
  login(@Body() input: PlatformAdminLoginRequestDto): Promise<PlatformAdminSessionResponse> {
    return this.platformAdminAuthService.login(input);
  }

  @Post("refresh")
  @HttpCode(200)
  refresh(@Body() input: PlatformAdminRefreshRequestDto): Promise<PlatformAdminRefreshResponse> {
    return this.platformAdminAuthService.refresh(input);
  }

  @Post("logout")
  @HttpCode(200)
  logout(@Body() input: PlatformAdminRefreshRequestDto): Promise<{ readonly loggedOut: true }> {
    return this.platformAdminAuthService.logout(input.refreshToken);
  }

  @Get("me")
  @UseGuards(JwtAccessTokenGuard, PlatformAdminGuard)
  me(@Req() request: AuthenticatedRequest): Promise<PlatformAdminProfileResponse> {
    const adminId = request.user?.sub;

    if (!adminId) {
      throw new UnauthorizedException("Authenticated admin context is not available.");
    }

    return this.platformAdminAuthService.getProfile(adminId);
  }

  @Post("change-password")
  @HttpCode(200)
  @UseGuards(JwtAccessTokenGuard, PlatformAdminGuard)
  changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() input: ChangePasswordRequestDto,
  ): Promise<{ readonly passwordChanged: true }> {
    const adminId = request.user?.sub;

    if (!adminId) {
      throw new UnauthorizedException("Authenticated admin context is not available.");
    }

    return this.platformAdminAuthService.changePassword(adminId, input);
  }
}
