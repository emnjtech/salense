import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAccessTokenGuard } from "../auth/guards/jwt-access-token.guard.js";
import { PlatformAdminGuard } from "../auth/guards/platform-admin.guard.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { AcceptInvitationRequestDto } from "./dto/accept-invitation-request.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { InvitationTokenQueryDto } from "./dto/invitation-token-query.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { SubscriptionInvitationRequestDto } from "./dto/subscription-invitation-request.dto.js";
import { SubscriptionService } from "./subscription.service.js";
import type {
  InvitationAccountCreationResponse,
  InvitationContextResponse,
} from "./types/invitation-account-response.type.js";
import type {
  SubscriptionAdminInvitationListResponse,
  SubscriptionInvitationArchiveResponse,
  SubscriptionInvitationApprovalResponse,
  SubscriptionInvitationRejectionResponse,
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
  listInvitations(): Promise<SubscriptionAdminInvitationListResponse> {
    return this.subscriptionService.listInvitations();
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
  ): Promise<SubscriptionInvitationArchiveResponse> {
    return this.subscriptionService.archiveInvitation(invitationId);
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
