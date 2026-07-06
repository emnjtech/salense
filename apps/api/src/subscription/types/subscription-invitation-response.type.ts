import type { SubscriptionPlan } from "../dto/subscription-invitation-request.dto.js";

export interface SubscriptionInvitationResponse {
  readonly invitationRequested: true;
  readonly invitationId: string;
  readonly preferredPlan: SubscriptionPlan;
}
