import { Controller, Get, Inject, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import {
  JwtAccessTokenGuard,
  type AuthenticatedRequest,
} from "../auth/guards/jwt-access-token.guard.js";
import { AiBriefingService } from "./ai-briefing.service.js";
import type { AiBriefingTodayResponse } from "./types/ai-objects.type.js";

@Controller("ai")
export class AiController {
  constructor(@Inject(AiBriefingService) private readonly aiBriefingService: AiBriefingService) {}

  @Get("briefing/today")
  @UseGuards(JwtAccessTokenGuard)
  getTodayBriefing(@Req() request: AuthenticatedRequest): Promise<AiBriefingTodayResponse> {
    const userId = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException("Authenticated request context is not available.");
    }

    return this.aiBriefingService.getTodayBriefing(userId);
  }
}
