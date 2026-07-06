export interface SubscriptionAdminInvitationResponse {
  readonly id: string;
  readonly businessName: string;
  readonly fullName: string;
  readonly workEmail: string;
  readonly phoneNumber: string | null;
  readonly websiteUrl: string | null;
  readonly preferredPlan: string;
  readonly platforms: readonly string[];
  readonly message: string | null;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly approvedAt: string | null;
  readonly rejectedAt: string | null;
  readonly archivedAt: string | null;
  readonly invitationTokenExpiresAt: string | null;
  readonly invitationTokenUsedAt: string | null;
}

export interface SubscriptionAdminInvitationListResponse {
  readonly invitations: readonly SubscriptionAdminInvitationResponse[];
}

export interface SubscriptionInvitationApprovalResponse {
  readonly invitation: SubscriptionAdminInvitationResponse;
  readonly invitationLink: string;
}

export interface SubscriptionInvitationRejectionResponse {
  readonly invitation: SubscriptionAdminInvitationResponse;
}

export interface SubscriptionInvitationArchiveResponse {
  readonly invitation: SubscriptionAdminInvitationResponse;
}
