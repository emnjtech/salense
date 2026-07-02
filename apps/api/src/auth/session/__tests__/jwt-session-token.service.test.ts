import { InternalServerErrorException, NotImplementedException } from "@nestjs/common";
import { JwtSessionConfigService } from "../jwt-session.config.js";
import { JwtSessionTokenService, type JwtSessionClaims } from "../jwt-session-token.service.js";

const claims: JwtSessionClaims = {
  sub: "user_1",
  email: "sarah@example.com",
  emailVerified: true,
};

describe("JwtSessionTokenService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("can be constructed without issuing sessions", () => {
    const service = new JwtSessionTokenService(new JwtSessionConfigService({}));

    expect(service).toBeInstanceOf(JwtSessionTokenService);
  });

  it("fails safely when access token issuing is attempted without secrets", async () => {
    const service = new JwtSessionTokenService(new JwtSessionConfigService({}));

    await expect(service.issueAccessToken(claims)).rejects.toThrow(InternalServerErrorException);
  });

  it("issues a signed JWT access token with safe claims only", async () => {
    jest.spyOn(Date, "now").mockReturnValue(new Date("2026-07-03T12:00:00.000Z").getTime());
    const config = new JwtSessionConfigService({
      JWT_ACCESS_TOKEN_SECRET: "access-secret",
      JWT_ACCESS_TOKEN_EXPIRES_IN: "15m",
    });
    const service = new JwtSessionTokenService(config);

    const token = await service.issueAccessToken(claims);
    const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");

    expect(encodedHeader).toBeDefined();
    expect(encodedPayload).toBeDefined();
    expect(encodedSignature).toBeDefined();
    expect(decodeJwtSegment(encodedHeader)).toEqual({ alg: "HS256", typ: "JWT" });
    expect(decodeJwtSegment(encodedPayload)).toEqual({
      sub: "user_1",
      email: "sarah@example.com",
      emailVerified: true,
      aud: "salense-api",
      iss: "salense-api",
      iat: 1783080000,
      exp: 1783080900,
    });
    expect(JSON.stringify(decodeJwtSegment(encodedPayload))).not.toContain("password");
    expect(JSON.stringify(decodeJwtSegment(encodedPayload))).not.toContain("passwordHash");
    expect(JSON.stringify(decodeJwtSegment(encodedPayload))).not.toContain("refreshToken");
  });

  it("keeps refresh token issuing as explicit scaffolding", () => {
    const service = new JwtSessionTokenService(new JwtSessionConfigService({}));

    expect(() => service.issueRefreshToken(claims)).toThrow(InternalServerErrorException);
  });

  it("keeps refresh token issuing and verification as explicit scaffolding", () => {
    const config = new JwtSessionConfigService({
      JWT_ACCESS_TOKEN_SECRET: "access-secret",
      JWT_REFRESH_TOKEN_SECRET: "refresh-secret",
      JWT_ACCESS_TOKEN_EXPIRES_IN: "15m",
      JWT_REFRESH_TOKEN_EXPIRES_IN: "30d",
    });
    const service = new JwtSessionTokenService(config);

    expect(() => service.issueRefreshToken(claims)).toThrow(NotImplementedException);
    expect(() => service.verifyAccessToken("access-token")).toThrow(NotImplementedException);
    expect(() => service.verifyRefreshToken("refresh-token")).toThrow(NotImplementedException);
  });
});

function decodeJwtSegment(segment: string | undefined): unknown {
  if (!segment) {
    return undefined;
  }

  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
}
