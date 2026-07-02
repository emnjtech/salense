import { Injectable, NotImplementedException } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";

@Injectable()
export class PlaceholderAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): never {
    void context;
    throw new NotImplementedException(
      "Authentication guards are not implemented in the Phase 1 skeleton.",
    );
  }
}
