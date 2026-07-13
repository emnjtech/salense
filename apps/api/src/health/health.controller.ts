import { Controller, Get, HttpCode, Inject, Res } from "@nestjs/common";
import { HealthService, type HealthCheckResponse } from "./health.service.js";

interface HttpStatusResponse {
  status(code: number): unknown;
}

@Controller("health")
export class HealthController {
  constructor(@Inject(HealthService) private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(200)
  async check(@Res({ passthrough: true }) response: HttpStatusResponse): Promise<HealthCheckResponse> {
    const health = await this.healthService.checkReadiness();

    if (health.status !== "ok") {
      response.status(503);
    }

    return health;
  }
}
