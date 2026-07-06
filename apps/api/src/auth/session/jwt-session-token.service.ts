import { createHash, createHmac } from "crypto";
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtSessionConfigService } from "./jwt-session.config.js";

export interface JwtSessionClaims {
  readonly sub: string;
  readonly email: string;
  readonly emailVerified: true;
  readonly platformRole?: "SUPER_ADMIN";
}

export interface JwtAccessTokenPayload extends JwtSessionClaims {
  readonly aud: "salense-api";
  readonly iss: "salense-api";
  readonly iat: number;
  readonly exp: number;
  readonly typ: "access";
}

export interface JwtRefreshTokenPayload extends JwtSessionClaims {
  readonly aud: "salense-api";
  readonly iss: "salense-api";
  readonly iat: number;
  readonly exp: number;
  readonly typ: "refresh";
}

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;

@Injectable()
export class JwtSessionTokenService {
  constructor(
    @Inject(JwtSessionConfigService)
    private readonly jwtSessionConfig: JwtSessionConfigService,
  ) {}

  async issueAccessToken(claims: JwtSessionClaims): Promise<string> {
    const config = this.jwtSessionConfig.getRequiredAccessTokenConfig();
    const issuedAt = Math.floor(Date.now() / 1000);
    const payload: JwtAccessTokenPayload = {
      sub: claims.sub,
      email: claims.email,
      emailVerified: true,
      ...(claims.platformRole ? { platformRole: claims.platformRole } : {}),
      aud: "salense-api",
      iss: "salense-api",
      iat: issuedAt,
      exp: issuedAt + parseExpirySeconds(config.accessTokenExpiresIn),
      typ: "access",
    };

    return signJwt(payload, config.accessTokenSecret);
  }

  async issueRefreshToken(claims: JwtSessionClaims): Promise<string> {
    const config = this.jwtSessionConfig.getRequiredConfig();
    const issuedAt = Math.floor(Date.now() / 1000);
    const payload: JwtRefreshTokenPayload = {
      sub: claims.sub,
      email: claims.email,
      emailVerified: true,
      ...(claims.platformRole ? { platformRole: claims.platformRole } : {}),
      aud: "salense-api",
      iss: "salense-api",
      iat: issuedAt,
      exp: issuedAt + parseExpirySeconds(config.refreshTokenExpiresIn),
      typ: "refresh",
    };

    return signJwt(payload, config.refreshTokenSecret);
  }

  async verifyAccessToken(token: string): Promise<JwtSessionClaims> {
    const config = this.jwtSessionConfig.getRequiredAccessTokenConfig();
    const payload = verifyJwt(token, config.accessTokenSecret, "access");
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp <= now) {
      throw new UnauthorizedException("JWT access token has expired.");
    }

    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: true,
      ...(payload.platformRole ? { platformRole: payload.platformRole } : {}),
    };
  }

  async verifyRefreshToken(token: string): Promise<JwtSessionClaims> {
    const config = this.jwtSessionConfig.getRequiredConfig();
    const payload = verifyJwt(token, config.refreshTokenSecret, "refresh");
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp <= now) {
      throw new UnauthorizedException("JWT refresh token has expired.");
    }

    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: true,
      ...(payload.platformRole ? { platformRole: payload.platformRole } : {}),
    };
  }

  hashRefreshToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  getRefreshTokenExpiryDate(now: Date = new Date()): Date {
    const config = this.jwtSessionConfig.getRequiredConfig();

    return new Date(now.getTime() + parseExpirySeconds(config.refreshTokenExpiresIn) * 1000);
  }
}

function signJwt(payload: JwtAccessTokenPayload | JwtRefreshTokenPayload, secret: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyJwt(
  token: string,
  secret: string,
  tokenType: JwtAccessTokenPayload["typ"] | JwtRefreshTokenPayload["typ"],
): JwtAccessTokenPayload | JwtRefreshTokenPayload {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");

  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new UnauthorizedException(`JWT ${tokenType} token is invalid.`);
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  if (encodedSignature !== expectedSignature) {
    throw new UnauthorizedException(`JWT ${tokenType} token is invalid.`);
  }

  const header = decodeBase64UrlJson(encodedHeader) as {
    readonly alg?: unknown;
    readonly typ?: unknown;
  };
  const payload = decodeBase64UrlJson(encodedPayload) as Partial<
    JwtAccessTokenPayload | JwtRefreshTokenPayload
  >;

  if (header.alg !== "HS256" || header.typ !== "JWT") {
    throw new UnauthorizedException(`JWT ${tokenType} token is invalid.`);
  }

  if (!isSessionTokenPayload(payload, tokenType)) {
    throw new UnauthorizedException(`JWT ${tokenType} token is invalid.`);
  }

  return payload;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64UrlJson(value: string): unknown {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    throw new UnauthorizedException("JWT access token is invalid.");
  }
}

function isSessionTokenPayload(
  payload: Partial<JwtAccessTokenPayload | JwtRefreshTokenPayload>,
  tokenType: JwtAccessTokenPayload["typ"] | JwtRefreshTokenPayload["typ"],
): payload is JwtAccessTokenPayload | JwtRefreshTokenPayload {
  return (
    typeof payload.sub === "string" &&
    typeof payload.email === "string" &&
    payload.emailVerified === true &&
    (payload.platformRole === undefined || payload.platformRole === "SUPER_ADMIN") &&
    payload.aud === "salense-api" &&
    payload.iss === "salense-api" &&
    payload.typ === tokenType &&
    typeof payload.iat === "number" &&
    typeof payload.exp === "number"
  );
}

function parseExpirySeconds(expiresIn: string): number {
  const match = /^(?<amount>\d+)(?<unit>[smhd])$/.exec(expiresIn.trim());

  if (!match?.groups) {
    throw new InternalServerErrorException(
      "JWT access token expiry format must be seconds, minutes, hours, or days.",
    );
  }

  const amount = Number(match.groups.amount);
  const unit = match.groups.unit;

  if (unit === "s") {
    return amount;
  }

  if (unit === "m") {
    return amount * SECONDS_PER_MINUTE;
  }

  if (unit === "h") {
    return amount * SECONDS_PER_HOUR;
  }

  return amount * SECONDS_PER_DAY;
}
