import { Controller, Get, HttpCode, Inject, Res } from "@nestjs/common";
import type { Response } from "express";
import { HealthService, type HealthCheckResponse } from "./health.service.js";

@Controller("health")
export class HealthController {
  constructor(@Inject(HealthService) private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(200)
  async check(@Res({ passthrough: true }) response: Response): Promise<HealthCheckResponse> {
    const health = await this.healthService.checkReadiness();

    if (health.status !== "ok") {
      response.status(503);
    }

    return health;
  }
}
