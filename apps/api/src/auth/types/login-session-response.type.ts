export interface LoginSessionResponse {
  readonly user: {
    readonly id: string;
    readonly email: string;
    readonly emailVerified: true;
  };
  readonly business: {
    readonly id: string;
    readonly name: string;
  } | null;
  readonly accessToken: string;
  readonly accessTokenExpiresIn: string;
  readonly refreshToken: string;
  readonly refreshTokenExpiresIn: string;
}
