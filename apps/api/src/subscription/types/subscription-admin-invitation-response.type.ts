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
  readonly archivedByUserId: string | null;
  readonly deletedAt: string | null;
  readonly deletedByUserId: string | null;
  readonly invitationTokenExpiresAt: string | null;
  readonly invitationTokenUsedAt: string | null;
  readonly linkedActiveAccount: boolean;
  readonly statusBeforeArchive: string | null;
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
  readonly message: "Invitation request archived.";
}

export interface SubscriptionInvitationRestoreResponse {
  readonly invitation: SubscriptionAdminInvitationResponse;
  readonly message: "Invitation request restored.";
}

export interface SubscriptionInvitationDeleteResponse {
  readonly deleted: true;
  readonly message: "Invitation request permanently deleted.";
}
