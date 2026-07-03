import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  JwtAccessTokenGuard,
  type AuthenticatedRequest,
} from "../auth/guards/jwt-access-token.guard.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { PrepareStoreConnectionRequestDto } from "./dto/prepare-store-connection-request.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { StoreActionRequestDto } from "./dto/store-action-request.dto.js";
import { StoreIntegrationsService } from "./store-integrations.service.js";
import type { ConnectedStoreResponse } from "./types/connected-store-response.type.js";
import type {
  ManualSyncJobStatusResponse,
  ManualSyncResponse,
} from "./types/manual-sync-response.type.js";
import type { SupportedStorePlatform } from "./types/store-platform.enum.js";

@Controller("store-integrations")
export class StoreIntegrationsController {
  constructor(
    @Inject(StoreIntegrationsService)
    private readonly storeIntegrationsService: StoreIntegrationsService,
  ) {}

  @Get("supported-platforms")
  listSupportedPlatforms(): readonly SupportedStorePlatform[] {
    return this.storeIntegrationsService.listSupportedPlatforms();
  }

  @Get("stores")
  @UseGuards(JwtAccessTokenGuard)
  listConnectedStores(@Req() request: AuthenticatedRequest): Promise<readonly ConnectedStoreResponse[]> {
    return this.storeIntegrationsService.listConnectedStores(getAuthenticatedUserId(request));
  }

  @Post("connect")
  @UseGuards(JwtAccessTokenGuard)
  prepareStoreConnection(
    @Req() request: AuthenticatedRequest,
    @Body() prepareStoreConnectionRequest: PrepareStoreConnectionRequestDto,
  ): Promise<ConnectedStoreResponse> {
    return this.storeIntegrationsService.prepareStoreConnection(
      getAuthenticatedUserId(request),
      prepareStoreConnectionRequest,
    );
  }

  @Post("disconnect")
  @UseGuards(JwtAccessTokenGuard)
  disconnectStore(
    @Req() request: AuthenticatedRequest,
    @Body() storeActionRequest: StoreActionRequestDto,
  ): Promise<never> {
    return this.storeIntegrationsService.disconnectStore(
      getAuthenticatedUserId(request),
      storeActionRequest,
    );
  }

  @Post("sync")
  @UseGuards(JwtAccessTokenGuard)
  requestManualSync(
    @Req() request: AuthenticatedRequest,
    @Body() storeActionRequest: StoreActionRequestDto,
  ): Promise<ManualSyncResponse> {
    return this.storeIntegrationsService.requestManualSync(
      getAuthenticatedUserId(request),
      storeActionRequest,
    );
  }

  @Get("sync-jobs/:jobId")
  @UseGuards(JwtAccessTokenGuard)
  getManualSyncJobStatus(
    @Req() request: AuthenticatedRequest,
    @Param("jobId") jobId: string,
  ): Promise<ManualSyncJobStatusResponse> {
    return this.storeIntegrationsService.getManualSyncJobStatus(
      getAuthenticatedUserId(request),
      jobId,
    );
  }
}

function getAuthenticatedUserId(request: AuthenticatedRequest): string {
  const userId = request.user?.sub;

  if (!userId) {
    throw new UnauthorizedException("Authenticated request context is not available.");
  }

  return userId;
}
