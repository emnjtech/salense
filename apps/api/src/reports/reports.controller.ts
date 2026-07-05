import {
  Controller,
  Get,
  Inject,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  JwtAccessTokenGuard,
  type AuthenticatedRequest,
} from "../auth/guards/jwt-access-token.guard.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { ReportsOverviewQueryDto } from "./dto/reports-overview-query.dto.js";
import { ReportsService } from "./reports.service.js";
import type { ReportsOverviewResponse } from "./types/reports-overview-response.type.js";

@Controller("reports")
export class ReportsController {
  constructor(@Inject(ReportsService) private readonly reportsService: ReportsService) {}

  @Get("overview")
  @UseGuards(JwtAccessTokenGuard)
  getOverview(
    @Req() request: AuthenticatedRequest,
    @Query() query: ReportsOverviewQueryDto,
  ): Promise<ReportsOverviewResponse> {
    const userId = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException("Authenticated request context is not available.");
    }

    return this.reportsService.getOverview(userId, query);
  }
}
