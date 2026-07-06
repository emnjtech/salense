export interface InvitationContextResponse {
  readonly valid: true;
  readonly businessName: string;
  readonly fullName: string;
  readonly workEmail: string;
  readonly preferredPlan: string;
}

export interface InvitationAccountCreationResponse {
  readonly accountCreated: true;
  readonly email: string;
  readonly businessName: string;
}
