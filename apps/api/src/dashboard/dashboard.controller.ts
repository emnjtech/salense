import { Controller, Get, Inject, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import {
  JwtAccessTokenGuard,
  type AuthenticatedRequest,
} from "../auth/guards/jwt-access-token.guard.js";
import { DashboardService } from "./dashboard.service.js";
import type { TodayDashboardResponse } from "./types/today-dashboard-response.type.js";

@Controller("dashboard")
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboardService: DashboardService) {}

  @Get("today")
  @UseGuards(JwtAccessTokenGuard)
  getTodayDashboard(@Req() request: AuthenticatedRequest): Promise<TodayDashboardResponse> {
    const userId = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException("Authenticated request context is not available.");
    }

    return this.dashboardService.getTodayDashboard(userId);
  }
}
