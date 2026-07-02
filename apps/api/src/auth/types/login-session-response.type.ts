export interface LoginSessionResponse {
  readonly user: {
    readonly id: string;
    readonly email: string;
    readonly emailVerified: true;
  };
  readonly session: {
    readonly accessToken: string;
    readonly refreshToken: string;
    readonly accessTokenExpiresIn: string;
    readonly refreshTokenExpiresIn: string;
  };
}
