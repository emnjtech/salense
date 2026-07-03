import { InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
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
      typ: "access",
    });
    expect(JSON.stringify(decodeJwtSegment(encodedPayload))).not.toContain("password");
    expect(JSON.stringify(decodeJwtSegment(encodedPayload))).not.toContain("passwordHash");
    expect(JSON.stringify(decodeJwtSegment(encodedPayload))).not.toContain("refreshToken");
  });

  it("verifies a valid JWT access token", async () => {
    jest.spyOn(Date, "now").mockReturnValue(new Date("2026-07-03T12:00:00.000Z").getTime());
    const config = new JwtSessionConfigService({
      JWT_ACCESS_TOKEN_SECRET: "access-secret",
      JWT_ACCESS_TOKEN_EXPIRES_IN: "15m",
    });
    const service = new JwtSessionTokenService(config);
    const token = await service.issueAccessToken(claims);

    await expect(service.verifyAccessToken(token)).resolves.toEqual(claims);
  });

  it("rejects an invalid JWT access token", async () => {
    const service = new JwtSessionTokenService(
      new JwtSessionConfigService({
        JWT_ACCESS_TOKEN_SECRET: "access-secret",
        JWT_ACCESS_TOKEN_EXPIRES_IN: "15m",
      }),
    );

    await expect(service.verifyAccessToken("not-a-jwt")).rejects.toThrow(UnauthorizedException);
  });

  it("rejects an expired JWT access token", async () => {
    const now = new Date("2026-07-03T12:00:00.000Z").getTime();
    const dateNowSpy = jest.spyOn(Date, "now").mockReturnValue(now);
    const service = new JwtSessionTokenService(
      new JwtSessionConfigService({
        JWT_ACCESS_TOKEN_SECRET: "access-secret",
        JWT_ACCESS_TOKEN_EXPIRES_IN: "1s",
      }),
    );
    const token = await service.issueAccessToken(claims);

    dateNowSpy.mockReturnValue(now + 2_000);

    await expect(service.verifyAccessToken(token)).rejects.toThrow(UnauthorizedException);
  });

  it("fails safely when refresh token issuing is attempted without secrets", async () => {
    const service = new JwtSessionTokenService(new JwtSessionConfigService({}));

    await expect(service.issueRefreshToken(claims)).rejects.toThrow(InternalServerErrorException);
  });

  it("issues, hashes, and verifies a signed JWT refresh token", async () => {
    jest.spyOn(Date, "now").mockReturnValue(new Date("2026-07-03T12:00:00.000Z").getTime());
    const config = new JwtSessionConfigService({
      JWT_ACCESS_TOKEN_SECRET: "access-secret",
      JWT_REFRESH_TOKEN_SECRET: "refresh-secret",
      JWT_ACCESS_TOKEN_EXPIRES_IN: "15m",
      JWT_REFRESH_TOKEN_EXPIRES_IN: "30d",
    });
    const service = new JwtSessionTokenService(config);

    const token = await service.issueRefreshToken(claims);
    const [, encodedPayload] = token.split(".");
    const tokenHash = service.hashRefreshToken(token);

    expect(decodeJwtSegment(encodedPayload)).toEqual({
      sub: "user_1",
      email: "sarah@example.com",
      emailVerified: true,
      aud: "salense-api",
      iss: "salense-api",
      iat: 1783080000,
      exp: 1785672000,
      typ: "refresh",
    });
    expect(tokenHash).not.toBe(token);
    expect(tokenHash).toHaveLength(64);
    await expect(service.verifyRefreshToken(token)).resolves.toEqual(claims);
  });

  it("rejects expired JWT refresh tokens", async () => {
    const now = new Date("2026-07-03T12:00:00.000Z").getTime();
    const dateNowSpy = jest.spyOn(Date, "now").mockReturnValue(now);
    const service = new JwtSessionTokenService(
      new JwtSessionConfigService({
        JWT_ACCESS_TOKEN_SECRET: "access-secret",
        JWT_REFRESH_TOKEN_SECRET: "refresh-secret",
        JWT_ACCESS_TOKEN_EXPIRES_IN: "15m",
        JWT_REFRESH_TOKEN_EXPIRES_IN: "1s",
      }),
    );
    const token = await service.issueRefreshToken(claims);

    dateNowSpy.mockReturnValue(now + 2_000);

    await expect(service.verifyRefreshToken(token)).rejects.toThrow(UnauthorizedException);
  });

  it("creates refresh token expiry dates from configuration", () => {
    jest.spyOn(Date, "now").mockReturnValue(new Date("2026-07-03T12:00:00.000Z").getTime());
    const service = new JwtSessionTokenService(
      new JwtSessionConfigService({
        JWT_ACCESS_TOKEN_SECRET: "access-secret",
        JWT_REFRESH_TOKEN_SECRET: "refresh-secret",
        JWT_ACCESS_TOKEN_EXPIRES_IN: "15m",
        JWT_REFRESH_TOKEN_EXPIRES_IN: "30d",
      }),
    );

    expect(service.getRefreshTokenExpiryDate(new Date("2026-07-03T12:00:00.000Z"))).toEqual(
      new Date("2026-08-02T12:00:00.000Z"),
    );
  });
});

function decodeJwtSegment(segment: string | undefined): unknown {
  if (!segment) {
    return undefined;
  }

  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
}
