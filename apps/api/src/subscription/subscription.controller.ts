import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../auth/guards/jwt-access-token.guard.js";
import { JwtAccessTokenGuard } from "../auth/guards/jwt-access-token.guard.js";
import { PlatformAdminGuard } from "../auth/guards/platform-admin.guard.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { AcceptInvitationRequestDto } from "./dto/accept-invitation-request.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { DeleteInvitationRequestDto } from "./dto/delete-invitation-request.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { InvitationTokenQueryDto } from "./dto/invitation-token-query.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { ListAdminInvitationsQueryDto } from "./dto/list-admin-invitations-query.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { SubscriptionInvitationRequestDto } from "./dto/subscription-invitation-request.dto.js";
import { SubscriptionService } from "./subscription.service.js";
import type {
  InvitationAccountCreationResponse,
  InvitationContextResponse,
} from "./types/invitation-account-response.type.js";
import type {
  SubscriptionAdminInvitationResponse,
  SubscriptionAdminInvitationListResponse,
  SubscriptionInvitationArchiveResponse,
  SubscriptionInvitationApprovalResponse,
  SubscriptionInvitationDeleteResponse,
  SubscriptionInvitationRejectionResponse,
  SubscriptionInvitationRestoreResponse,
} from "./types/subscription-admin-invitation-response.type.js";
import type { SubscriptionInvitationResponse } from "./types/subscription-invitation-response.type.js";

@Controller("subscription")
export class SubscriptionController {
  constructor(@Inject(SubscriptionService) private readonly subscriptionService: SubscriptionService) {}

  @Post("invitations")
  requestInvitation(
    @Body() input: SubscriptionInvitationRequestDto,
  ): Promise<SubscriptionInvitationResponse> {
    return this.subscriptionService.requestInvitation(input);
  }

  @Get("invitations/admin")
  @UseGuards(JwtAccessTokenGuard, PlatformAdminGuard)
  listInvitations(
    @Query() query: ListAdminInvitationsQueryDto,
  ): Promise<SubscriptionAdminInvitationListResponse> {
    return this.subscriptionService.listInvitations(query);
  }

  @Get("invitations/admin/:invitationId")
  @UseGuards(JwtAccessTokenGuard, PlatformAdminGuard)
  getAdminInvitation(
    @Param("invitationId") invitationId: string,
  ): Promise<{ readonly invitation: SubscriptionAdminInvitationResponse }> {
    return this.subscriptionService.getAdminInvitation(invitationId);
  }

  @Post("invitations/:invitationId/approve")
  @HttpCode(200)
  @UseGuards(JwtAccessTokenGuard, PlatformAdminGuard)
  approveInvitation(
    @Param("invitationId") invitationId: string,
  ): Promise<SubscriptionInvitationApprovalResponse> {
    return this.subscriptionService.approveInvitation(invitationId);
  }

  @Post("invitations/:invitationId/reject")
  @HttpCode(200)
  @UseGuards(JwtAccessTokenGuard, PlatformAdminGuard)
  rejectInvitation(
    @Param("invitationId") invitationId: string,
  ): Promise<SubscriptionInvitationRejectionResponse> {
    return this.subscriptionService.rejectInvitation(invitationId);
  }

  @Post("invitations/:invitationId/archive")
  @HttpCode(200)
  @UseGuards(JwtAccessTokenGuard, PlatformAdminGuard)
  archiveInvitation(
    @Param("invitationId") invitationId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<SubscriptionInvitationArchiveResponse> {
    return this.subscriptionService.archiveInvitation(invitationId, getAdminId(request));
  }

  @Post("invitations/:invitationId/restore")
  @HttpCode(200)
  @UseGuards(JwtAccessTokenGuard, PlatformAdminGuard)
  restoreInvitation(
    @Param("invitationId") invitationId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<SubscriptionInvitationRestoreResponse> {
    return this.subscriptionService.restoreInvitation(invitationId, getAdminId(request));
  }

  @Post("invitations/:invitationId/delete")
  @HttpCode(200)
  @UseGuards(JwtAccessTokenGuard, PlatformAdminGuard)
  permanentlyDeleteInvitation(
    @Param("invitationId") invitationId: string,
    @Body() input: DeleteInvitationRequestDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<SubscriptionInvitationDeleteResponse> {
    return this.subscriptionService.permanentlyDeleteInvitation(
      invitationId,
      input.confirmation,
      getAdminId(request),
    );
  }

  @Get("invitations/accept")
  getInvitationContext(
    @Query() query: InvitationTokenQueryDto,
  ): Promise<InvitationContextResponse> {
    return this.subscriptionService.getInvitationContext(query.token);
  }

  @Post("invitations/accept")
  @HttpCode(200)
  acceptInvitation(
    @Body() input: AcceptInvitationRequestDto,
  ): Promise<InvitationAccountCreationResponse> {
    return this.subscriptionService.acceptInvitation(input);
  }
}

function getAdminId(request: AuthenticatedRequest): string {
  return request.user?.sub ?? "platform-admin";
}
