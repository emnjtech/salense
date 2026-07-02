export interface LoginEligibilityResponse {
  readonly user: {
    readonly id: string;
    readonly email: string;
    readonly emailVerified: true;
  };
}
