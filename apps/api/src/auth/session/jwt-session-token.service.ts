import { Inject, Injectable, NotImplementedException } from "@nestjs/common";
import { JwtSessionConfigService } from "./jwt-session.config.js";

export interface JwtSessionClaims {
  readonly sub: string;
  readonly email: string;
  readonly emailVerified: true;
}

@Injectable()
export class JwtSessionTokenService {
  constructor(
    @Inject(JwtSessionConfigService)
    private readonly jwtSessionConfig: JwtSessionConfigService,
  ) {}

  issueAccessToken(claims: JwtSessionClaims): Promise<string> {
    void claims;
    this.jwtSessionConfig.getRequiredConfig();
    throw new NotImplementedException("JWT access token issuing is not implemented yet.");
  }

  issueRefreshToken(claims: JwtSessionClaims): Promise<string> {
    void claims;
    this.jwtSessionConfig.getRequiredConfig();
    throw new NotImplementedException("JWT refresh token issuing is not implemented yet.");
  }

  verifyAccessToken(token: string): Promise<JwtSessionClaims> {
    void token;
    this.jwtSessionConfig.getRequiredConfig();
    throw new NotImplementedException("JWT access token verification is not implemented yet.");
  }

  verifyRefreshToken(token: string): Promise<JwtSessionClaims> {
    void token;
    this.jwtSessionConfig.getRequiredConfig();
    throw new NotImplementedException("JWT refresh token verification is not implemented yet.");
  }
}
