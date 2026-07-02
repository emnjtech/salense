export interface AuthenticatedUser {
  readonly userId: string;
  readonly businessId: string;
  readonly email: string;
  readonly roles: readonly string[];
}
