import { Body, Controller, Inject, Post } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { SubscriptionInvitationRequestDto } from "./dto/subscription-invitation-request.dto.js";
import { SubscriptionService } from "./subscription.service.js";
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
}
