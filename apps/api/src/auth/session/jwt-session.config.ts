import { Injectable, InternalServerErrorException } from "@nestjs/common";

export const JWT_SESSION_ENV_KEYS = {
  accessTokenSecret: "JWT_ACCESS_TOKEN_SECRET",
  refreshTokenSecret: "JWT_REFRESH_TOKEN_SECRET",
  accessTokenExpiresIn: "JWT_ACCESS_TOKEN_EXPIRES_IN",
  refreshTokenExpiresIn: "JWT_REFRESH_TOKEN_EXPIRES_IN",
} as const;

export interface JwtSessionConfig {
  readonly accessTokenSecret: string;
  readonly refreshTokenSecret: string;
  readonly accessTokenExpiresIn: string;
  readonly refreshTokenExpiresIn: string;
}

export interface JwtAccessTokenConfig {
  readonly accessTokenSecret: string;
  readonly accessTokenExpiresIn: string;
}

@Injectable()
export class JwtSessionConfigService {
  constructor(private readonly environment: NodeJS.ProcessEnv = process.env) {}

  getRequiredConfig(): JwtSessionConfig {
    const accessTokenConfig = this.getRequiredAccessTokenConfig();
    const refreshTokenExpiresIn = this.getRequiredValue(JWT_SESSION_ENV_KEYS.refreshTokenExpiresIn);
    const refreshTokenSecret = this.getRequiredValue(JWT_SESSION_ENV_KEYS.refreshTokenSecret);

    return {
      accessTokenSecret: accessTokenConfig.accessTokenSecret,
      refreshTokenSecret,
      accessTokenExpiresIn: accessTokenConfig.accessTokenExpiresIn,
      refreshTokenExpiresIn,
    };
  }

  getRequiredAccessTokenConfig(): JwtAccessTokenConfig {
    return {
      accessTokenSecret: this.getRequiredValue(JWT_SESSION_ENV_KEYS.accessTokenSecret),
      accessTokenExpiresIn: this.getRequiredValue(JWT_SESSION_ENV_KEYS.accessTokenExpiresIn),
    };
  }

  private getRequiredValue(key: keyof typeof this.environment | string): string {
    const value = this.environment[key]?.trim();

    if (!value) {
      throw new InternalServerErrorException(`Missing required JWT session configuration: ${key}.`);
    }

    return value;
  }
}
