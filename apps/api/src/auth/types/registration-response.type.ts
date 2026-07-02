export interface RegistrationResponse {
  readonly user: {
    readonly id: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly email: string;
    readonly emailVerified: boolean;
  };
  readonly business: {
    readonly id: string;
    readonly name: string;
  };
}
