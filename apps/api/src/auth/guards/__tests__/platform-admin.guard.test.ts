import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import { PlatformAdminGuard } from "../platform-admin.guard.js";

function createContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe("PlatformAdminGuard", () => {
  it("allows SUPER_ADMIN platform administrators", () => {
    const guard = new PlatformAdminGuard();

    expect(
      guard.canActivate(
        createContext({
          email: "admin@salense.local",
          emailVerified: true,
          platformRole: "SUPER_ADMIN",
          sessionKind: "PLATFORM_ADMIN",
          sub: "admin_1",
        }),
      ),
    ).toBe(true);
  });

  it("blocks legacy role claims that are not admin sessions", () => {
    const guard = new PlatformAdminGuard();

    expect(() =>
      guard.canActivate(
        createContext({
          email: "owner@example.com",
          emailVerified: true,
          platformRole: "SUPER_ADMIN",
          sub: "user_1",
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it("blocks authenticated business users without a platform role", () => {
    const guard = new PlatformAdminGuard();

    expect(() =>
      guard.canActivate(
        createContext({
          email: "owner@example.com",
          emailVerified: true,
          sub: "user_2",
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});
