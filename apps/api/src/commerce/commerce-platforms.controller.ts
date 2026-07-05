import {
  Controller,
  Get,
  Inject,
  Param,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  JwtAccessTokenGuard,
  type AuthenticatedRequest,
} from "../auth/guards/jwt-access-token.guard.js";
import { CommercePlatformsService } from "./commerce-platforms.service.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { PlatformParamDto } from "./dto/platform-param.dto.js";
import type { CommercePlatformSummaryResponse } from "./types/commerce-platform-summary-response.type.js";

@Controller("commerce/platforms")
export class CommercePlatformsController {
  constructor(
    @Inject(CommercePlatformsService)
    private readonly commercePlatformsService: CommercePlatformsService,
  ) {}

  @Get(":platform/summary")
  @UseGuards(JwtAccessTokenGuard)
  getPlatformSummary(
    @Req() request: AuthenticatedRequest,
    @Param() params: PlatformParamDto,
  ): Promise<CommercePlatformSummaryResponse> {
    const userId = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException("Authenticated request context is not available.");
    }

    return this.commercePlatformsService.getPlatformSummary(userId, params.platform);
  }
}
