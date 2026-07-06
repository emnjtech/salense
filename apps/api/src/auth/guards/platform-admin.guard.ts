import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "./jwt-access-token.guard.js";

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.user?.platformRole !== "SUPER_ADMIN") {
      throw new ForbiddenException("Platform administration requires SUPER_ADMIN access.");
    }

    return true;
  }
}
