import { InternalServerErrorException, NotImplementedException } from "@nestjs/common";
import { JwtSessionConfigService } from "../jwt-session.config.js";
import { JwtSessionTokenService, type JwtSessionClaims } from "../jwt-session-token.service.js";

const claims: JwtSessionClaims = {
  sub: "user_1",
  email: "sarah@example.com",
  emailVerified: true,
};

describe("JwtSessionTokenService", () => {
  it("can be constructed without issuing sessions", () => {
    const service = new JwtSessionTokenService(new JwtSessionConfigService({}));

    expect(service).toBeInstanceOf(JwtSessionTokenService);
  });

  it("fails safely when token issuing is attempted without secrets", () => {
    const service = new JwtSessionTokenService(new JwtSessionConfigService({}));

    expect(() => service.issueAccessToken(claims)).toThrow(InternalServerErrorException);
    expect(() => service.issueRefreshToken(claims)).toThrow(InternalServerErrorException);
  });

  it("keeps token issuing and verification as explicit scaffolding", () => {
    const config = new JwtSessionConfigService({
      JWT_ACCESS_TOKEN_SECRET: "access-secret",
      JWT_REFRESH_TOKEN_SECRET: "refresh-secret",
      JWT_ACCESS_TOKEN_EXPIRES_IN: "15m",
      JWT_REFRESH_TOKEN_EXPIRES_IN: "30d",
    });
    const service = new JwtSessionTokenService(config);

    expect(() => service.issueAccessToken(claims)).toThrow(NotImplementedException);
    expect(() => service.issueRefreshToken(claims)).toThrow(NotImplementedException);
    expect(() => service.verifyAccessToken("access-token")).toThrow(NotImplementedException);
    expect(() => service.verifyRefreshToken("refresh-token")).toThrow(NotImplementedException);
  });
});
