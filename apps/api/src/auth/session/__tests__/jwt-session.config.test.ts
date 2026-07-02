import { InternalServerErrorException } from "@nestjs/common";
import { JWT_SESSION_ENV_KEYS, JwtSessionConfigService } from "../jwt-session.config.js";

describe("JwtSessionConfigService", () => {
  it("requires all JWT session configuration values", () => {
    const service = new JwtSessionConfigService({});

    expect(() => service.getRequiredConfig()).toThrow(InternalServerErrorException);
  });

  it("returns configured JWT session placeholders from the environment", () => {
    const service = new JwtSessionConfigService({
      [JWT_SESSION_ENV_KEYS.accessTokenSecret]: "access-secret",
      [JWT_SESSION_ENV_KEYS.refreshTokenSecret]: "refresh-secret",
      [JWT_SESSION_ENV_KEYS.accessTokenExpiresIn]: "15m",
      [JWT_SESSION_ENV_KEYS.refreshTokenExpiresIn]: "30d",
    });

    expect(service.getRequiredConfig()).toEqual({
      accessTokenSecret: "access-secret",
      refreshTokenSecret: "refresh-secret",
      accessTokenExpiresIn: "15m",
      refreshTokenExpiresIn: "30d",
    });
  });

  it("allows access token config without requiring refresh token config", () => {
    const service = new JwtSessionConfigService({
      [JWT_SESSION_ENV_KEYS.accessTokenSecret]: "access-secret",
      [JWT_SESSION_ENV_KEYS.accessTokenExpiresIn]: "15m",
    });

    expect(service.getRequiredAccessTokenConfig()).toEqual({
      accessTokenSecret: "access-secret",
      accessTokenExpiresIn: "15m",
    });
  });
});
