export interface RefreshSessionResponse {
  readonly user: {
    readonly id: string;
    readonly email: string;
    readonly emailVerified: true;
  };
  readonly accessToken: string;
  readonly accessTokenExpiresIn: string;
}
