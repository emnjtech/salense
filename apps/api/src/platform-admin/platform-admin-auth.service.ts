import { Inject, Injectable, UnauthorizedException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { BcryptPasswordHasherService, isPasswordPolicyCompliant } from "../auth/security/index.js";
import { JwtSessionConfigService, JwtSessionTokenService } from "../auth/session/index.js";
import type { ChangePasswordRequestDto } from "../auth/dto/change-password-request.dto.js";
import type { PlatformAdminLoginRequestDto } from "./dto/platform-admin-login-request.dto.js";
import type { PlatformAdminRefreshRequestDto } from "./dto/platform-admin-refresh-request.dto.js";
import type {
  PlatformAdminProfileResponse,
  PlatformAdminRefreshResponse,
  PlatformAdminSessionResponse,
} from "./types/platform-admin-auth-response.type.js";

interface PlatformAdminRecord {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: "SUPER_ADMIN";
  readonly status: "ACTIVE" | "DISABLED";
  readonly lastLoginAt: Date | null;
}

interface PlatformAdminPrismaClient {
  readonly platformAdmin: {
    findUnique(args: {
      readonly where: { readonly email: string } | { readonly id: string };
      readonly select: PlatformAdminSelect;
    }): Promise<PlatformAdminRecord | null>;
    update(args: {
      readonly where: { readonly id: string };
      readonly data: Partial<{
        readonly lastLoginAt: Date;
        readonly passwordHash: string;
      }>;
      readonly select?: PlatformAdminSelect;
    }): Promise<PlatformAdminRecord>;
  };
  readonly platformAdminRefreshToken: {
    create(args: {
      readonly data: {
        readonly platformAdminId: string;
        readonly tokenHash: string;
        readonly expiresAt: Date;
      };
    }): Promise<unknown>;
    findUnique(args: {
      readonly where: { readonly tokenHash: string };
      readonly select: {
        readonly id: true;
        readonly platformAdminId: true;
        readonly expiresAt: true;
        readonly revokedAt: true;
      };
    }): Promise<{
      readonly id: string;
      readonly platformAdminId: string;
      readonly expiresAt: Date;
      readonly revokedAt: Date | null;
    } | null>;
    update(args: {
      readonly where: { readonly id: string };
      readonly data: { readonly revokedAt: Date };
    }): Promise<unknown>;
    updateMany(args: {
      readonly where: {
        readonly platformAdminId: string;
        readonly revokedAt: null;
      };
      readonly data: { readonly revokedAt: Date };
    }): Promise<unknown>;
  };
  $transaction<T>(callback: (transaction: PlatformAdminPrismaClient) => Promise<T>): Promise<T>;
}

interface PlatformAdminSelect {
  readonly id: true;
  readonly email: true;
  readonly passwordHash: true;
  readonly firstName: true;
  readonly lastName: true;
  readonly role: true;
  readonly status: true;
  readonly lastLoginAt: true;
}

const platformAdminSelect = {
  id: true,
  email: true,
  passwordHash: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  lastLoginAt: true,
} as const;

@Injectable()
export class PlatformAdminAuthService {
  private readonly prisma: PlatformAdminPrismaClient;

  constructor(
    @Inject(PrismaService) prismaService: PrismaService,
    @Inject(BcryptPasswordHasherService)
    private readonly passwordHasher: BcryptPasswordHasherService,
    @Inject(JwtSessionTokenService)
    private readonly jwtSessionTokens: JwtSessionTokenService,
    @Inject(JwtSessionConfigService)
    private readonly jwtSessionConfig: JwtSessionConfigService,
  ) {
    this.prisma = prismaService.client as unknown as PlatformAdminPrismaClient;
  }

  async login(input: PlatformAdminLoginRequestDto): Promise<PlatformAdminSessionResponse> {
    const email = input.email.trim().toLowerCase();
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { email },
      select: platformAdminSelect,
    });

    if (!admin) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    if (admin.status !== "ACTIVE") {
      throw new ForbiddenException("This admin account is disabled.");
    }

    const passwordMatches = await this.passwordHasher.comparePassword(
      input.password,
      admin.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    await this.prisma.platformAdmin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
      select: platformAdminSelect,
    });

    return this.issueSession(admin);
  }

  async refresh(input: PlatformAdminRefreshRequestDto): Promise<PlatformAdminRefreshResponse> {
    const claims = await this.jwtSessionTokens.verifyRefreshToken(input.refreshToken);

    if (claims.sessionKind !== "PLATFORM_ADMIN" || claims.platformRole !== "SUPER_ADMIN") {
      throw new UnauthorizedException("Admin refresh token is invalid.");
    }

    const tokenHash = this.jwtSessionTokens.hashRefreshToken(input.refreshToken);
    const storedToken = await this.prisma.platformAdminRefreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        platformAdminId: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt <= new Date()) {
      throw new UnauthorizedException("Admin refresh token is invalid.");
    }

    const admin = await this.getActiveAdmin(storedToken.platformAdminId);

    if (admin.id !== claims.sub) {
      throw new UnauthorizedException("Admin refresh token is invalid.");
    }

    const accessToken = await this.jwtSessionTokens.issueAccessToken(toAdminClaims(admin));
    const { accessTokenExpiresIn } = this.jwtSessionConfig.getRequiredAccessTokenConfig();

    return {
      admin: toAdminSessionUser(admin),
      accessToken,
      accessTokenExpiresIn,
    };
  }

  async logout(refreshToken: string): Promise<{ readonly loggedOut: true }> {
    await this.jwtSessionTokens.verifyRefreshToken(refreshToken);
    const tokenHash = this.jwtSessionTokens.hashRefreshToken(refreshToken);
    const storedToken = await this.prisma.platformAdminRefreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        platformAdminId: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (storedToken && !storedToken.revokedAt) {
      await this.prisma.platformAdminRefreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });
    }

    return { loggedOut: true };
  }

  async getProfile(adminId: string): Promise<PlatformAdminProfileResponse> {
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { id: adminId },
      select: platformAdminSelect,
    });

    if (!admin) {
      throw new UnauthorizedException("Admin account could not be found.");
    }

    return {
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role,
      status: admin.status,
      lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
    };
  }

  async changePassword(
    adminId: string,
    input: ChangePasswordRequestDto,
  ): Promise<{ readonly passwordChanged: true }> {
    if (input.newPassword !== input.confirmNewPassword) {
      throw new BadRequestException("Password confirmation does not match.");
    }

    if (!isPasswordPolicyCompliant(input.newPassword)) {
      throw new BadRequestException("Password does not meet Chapter 6.1 requirements.");
    }

    const admin = await this.getActiveAdmin(adminId);
    const currentPasswordMatches = await this.passwordHasher.comparePassword(
      input.currentPassword,
      admin.passwordHash,
    );

    if (!currentPasswordMatches) {
      throw new UnauthorizedException("Current password is incorrect.");
    }

    const passwordHash = await this.passwordHasher.hashPassword(input.newPassword);
    const revokedAt = new Date();

    await this.prisma.$transaction(async (transaction) => {
      await transaction.platformAdmin.update({
        where: { id: admin.id },
        data: { passwordHash },
      });
      await transaction.platformAdminRefreshToken.updateMany({
        where: {
          platformAdminId: admin.id,
          revokedAt: null,
        },
        data: { revokedAt },
      });
    });

    return { passwordChanged: true };
  }

  private async issueSession(admin: PlatformAdminRecord): Promise<PlatformAdminSessionResponse> {
    const accessToken = await this.jwtSessionTokens.issueAccessToken(toAdminClaims(admin));
    const refreshToken = await this.jwtSessionTokens.issueRefreshToken(toAdminClaims(admin));
    const tokenHash = this.jwtSessionTokens.hashRefreshToken(refreshToken);
    const refreshTokenExpiresAt = this.jwtSessionTokens.getRefreshTokenExpiryDate();
    const { accessTokenExpiresIn, refreshTokenExpiresIn } =
      this.jwtSessionConfig.getRequiredConfig();

    await this.prisma.platformAdminRefreshToken.create({
      data: {
        platformAdminId: admin.id,
        tokenHash,
        expiresAt: refreshTokenExpiresAt,
      },
    });

    return {
      admin: toAdminSessionUser(admin),
      accessToken,
      accessTokenExpiresIn,
      refreshToken,
      refreshTokenExpiresIn,
    };
  }

  private async getActiveAdmin(adminId: string): Promise<PlatformAdminRecord> {
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { id: adminId },
      select: platformAdminSelect,
    });

    if (!admin || admin.status !== "ACTIVE") {
      throw new UnauthorizedException("Admin account could not be found.");
    }

    return admin;
  }
}

function toAdminClaims(admin: PlatformAdminRecord) {
  return {
    sub: admin.id,
    email: admin.email,
    emailVerified: true,
    platformRole: admin.role,
    sessionKind: "PLATFORM_ADMIN",
  } as const;
}

function toAdminSessionUser(admin: PlatformAdminRecord): PlatformAdminSessionResponse["admin"] {
  return {
    id: admin.id,
    email: admin.email,
    firstName: admin.firstName,
    lastName: admin.lastName,
    role: admin.role,
    status: "ACTIVE",
  };
}
