import {
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { JwtSessionTokenService, type JwtSessionClaims } from "../session/index.js";

export interface AuthenticatedRequest {
  readonly headers: Record<string, string | readonly string[] | undefined>;
  user?: JwtSessionClaims;
}

@Injectable()
export class JwtAccessTokenGuard implements CanActivate {
  constructor(
    @Inject(JwtSessionTokenService)
    private readonly jwtSessionTokens: JwtSessionTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);

    request.user = await this.jwtSessionTokens.verifyAccessToken(token);

    return true;
  }
}

function extractBearerToken(authorization: string | readonly string[] | undefined): string {
  const value = Array.isArray(authorization) ? authorization[0] : authorization;

  if (!value) {
    throw new UnauthorizedException("Missing access token.");
  }

  const [scheme, token] = value.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new UnauthorizedException("Missing access token.");
  }

  return token;
}
