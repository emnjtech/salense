export interface PlatformAdminSessionResponse {
  readonly admin: {
    readonly id: string;
    readonly email: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly role: "SUPER_ADMIN";
    readonly status: "ACTIVE";
  };
  readonly accessToken: string;
  readonly accessTokenExpiresIn: string;
  readonly refreshToken: string;
  readonly refreshTokenExpiresIn: string;
}

export interface PlatformAdminRefreshResponse {
  readonly admin: PlatformAdminSessionResponse["admin"];
  readonly accessToken: string;
  readonly accessTokenExpiresIn: string;
}

export interface PlatformAdminProfileResponse {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: "SUPER_ADMIN";
  readonly status: "ACTIVE" | "DISABLED";
  readonly lastLoginAt: string | null;
}
