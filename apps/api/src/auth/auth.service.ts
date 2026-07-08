import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { EmailService } from "../email/email.service.js";
import { PrismaService } from "../database/prisma.service.js";
import type { ChangePasswordRequestDto } from "./dto/change-password-request.dto.js";
import type { EmailVerificationRequestDto } from "./dto/email-verification-request.dto.js";
import type { LoginRequestDto } from "./dto/login-request.dto.js";
import type { LogoutRequestDto } from "./dto/logout-request.dto.js";
import type { PasswordResetConfirmationRequestDto } from "./dto/password-reset-confirmation-request.dto.js";
import type { PasswordResetRequestDto } from "./dto/password-reset-request.dto.js";
import type { RefreshSessionRequestDto } from "./dto/refresh-session-request.dto.js";
import type { RegisterRequestDto } from "./dto/register-request.dto.js";
import {
  BcryptPasswordHasherService,
  EmailVerificationTokenService,
  isPasswordPolicyCompliant,
  PasswordResetTokenService,
} from "./security/index.js";
import { JwtSessionConfigService, JwtSessionTokenService } from "./session/index.js";
import type { ChangePasswordResponse } from "./types/change-password-response.type.js";
import type { CurrentUserResponse } from "./types/current-user-response.type.js";
import type { EmailVerificationResponse } from "./types/email-verification-response.type.js";
import type { LoginSessionResponse } from "./types/login-session-response.type.js";
import type { LogoutResponse } from "./types/logout-response.type.js";
import type {
  PasswordResetConfirmationResponse,
  PasswordResetRequestResponse,
} from "./types/password-reset-response.type.js";
import type { RefreshSessionResponse } from "./types/refresh-session-response.type.js";
import type { RegistrationResponse } from "./types/registration-response.type.js";

interface RegistrationPrismaClient {
  readonly user: {
    findUnique(args: {
      readonly where: { readonly email: string } | { readonly id: string };
      readonly select?: {
        readonly id?: true;
        readonly firstName?: true;
        readonly lastName?: true;
        readonly email?: true;
        readonly passwordHash?: true;
        readonly emailVerified?: true;
        readonly businesses?: {
          readonly select: {
            readonly id: true;
            readonly name: true;
          };
          readonly take: 1;
        };
      };
    }): Promise<{
      readonly id: string;
      readonly firstName?: string;
      readonly lastName?: string;
      readonly email?: string;
      readonly passwordHash?: string;
      readonly emailVerified?: boolean;
      readonly businesses?: readonly { readonly id: string; readonly name: string }[];
    } | null>;
    create(args: {
      readonly data: {
        readonly firstName: string;
        readonly lastName: string;
        readonly email: string;
        readonly passwordHash: string;
        readonly emailVerified: false;
        readonly businesses: {
          readonly create: {
            readonly name: string;
          };
        };
        readonly emailVerificationTokens: {
          readonly create: {
            readonly tokenHash: string;
            readonly expiresAt: Date;
          };
        };
      };
      readonly select: {
        readonly id: true;
        readonly firstName: true;
        readonly lastName: true;
        readonly email: true;
        readonly emailVerified: true;
        readonly businesses: {
          readonly select: {
            readonly id: true;
            readonly name: true;
          };
          readonly take: 1;
        };
      };
    }): Promise<{
      readonly id: string;
      readonly firstName: string;
      readonly lastName: string;
      readonly email: string;
      readonly emailVerified: boolean;
      readonly businesses: readonly { readonly id: string; readonly name: string }[];
    }>;
    update(args: {
      readonly where: { readonly id: string };
      readonly data: {
        readonly emailVerified?: true;
        readonly emailVerifiedAt?: Date;
        readonly passwordHash?: string;
      };
    }): Promise<unknown>;
  };
  readonly emailVerificationToken: {
    findUnique(args: {
      readonly where: { readonly tokenHash: string };
      readonly select: {
        readonly id: true;
        readonly userId: true;
        readonly expiresAt: true;
        readonly usedAt: true;
      };
    }): Promise<{
      readonly id: string;
      readonly userId: string;
      readonly expiresAt: Date;
      readonly usedAt: Date | null;
    } | null>;
    update(args: {
      readonly where: { readonly id: string };
      readonly data: { readonly usedAt: Date };
    }): Promise<unknown>;
  };
  readonly passwordResetToken: {
    create(args: {
      readonly data: {
        readonly userId: string;
        readonly tokenHash: string;
        readonly expiresAt: Date;
      };
    }): Promise<unknown>;
    findUnique(args: {
      readonly where: { readonly tokenHash: string };
      readonly select: {
        readonly id: true;
        readonly userId: true;
        readonly expiresAt: true;
        readonly usedAt: true;
      };
    }): Promise<{
      readonly id: string;
      readonly userId: string;
      readonly expiresAt: Date;
      readonly usedAt: Date | null;
    } | null>;
    update(args: {
      readonly where: { readonly id: string };
      readonly data: { readonly usedAt: Date };
    }): Promise<unknown>;
  };
  readonly refreshToken: {
    create(args: {
      readonly data: {
        readonly userId: string;
        readonly tokenHash: string;
        readonly expiresAt: Date;
      };
    }): Promise<unknown>;
    findUnique(args: {
      readonly where: { readonly tokenHash: string };
      readonly select: {
        readonly id: true;
        readonly userId: true;
        readonly expiresAt: true;
        readonly revokedAt: true;
      };
    }): Promise<{
      readonly id: string;
      readonly userId: string;
      readonly expiresAt: Date;
      readonly revokedAt: Date | null;
    } | null>;
    update(args: {
      readonly where: { readonly id: string };
      readonly data: { readonly revokedAt: Date };
    }): Promise<unknown>;
    updateMany(args: {
      readonly where: {
        readonly userId: string;
        readonly revokedAt: null;
      };
      readonly data: { readonly revokedAt: Date };
    }): Promise<unknown>;
  };
  $transaction<T>(callback: (transaction: RegistrationPrismaClient) => Promise<T>): Promise<T>;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(BcryptPasswordHasherService)
    private readonly passwordHasher: BcryptPasswordHasherService,
    @Inject(EmailVerificationTokenService)
    private readonly emailVerificationTokens: EmailVerificationTokenService,
    @Inject(PasswordResetTokenService)
    private readonly passwordResetTokens: PasswordResetTokenService,
    @Inject(EmailService) private readonly emailService: EmailService,
    @Inject(JwtSessionTokenService)
    private readonly jwtSessionTokens: JwtSessionTokenService,
    @Inject(JwtSessionConfigService)
    private readonly jwtSessionConfig: JwtSessionConfigService,
  ) {}

  async register(registerRequest: RegisterRequestDto): Promise<RegistrationResponse> {
    if (!isPublicRegistrationEnabled()) {
      throw new ForbiddenException("Public registration is currently invite-only.");
    }

    if (registerRequest.password !== registerRequest.confirmPassword) {
      throw new BadRequestException("Password confirmation does not match.");
    }

    if (!isPasswordPolicyCompliant(registerRequest.password)) {
      throw new BadRequestException(
        "Password must be at least 12 characters and include uppercase, lowercase, number, and special character.",
      );
    }

    const normalizedEmail = registerRequest.email.trim().toLowerCase();
    const prisma = this.prismaService.client as unknown as RegistrationPrismaClient;
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (existingUser) {
      throw new ConflictException("Email already exists.");
    }

    const passwordHash = await this.passwordHasher.hashPassword(registerRequest.password);
    const verificationToken = this.emailVerificationTokens.generateToken();
    const tokenHash = this.emailVerificationTokens.hashToken(verificationToken);
    const expiresAt = this.emailVerificationTokens.getExpiryDate();
    const createdUser = await prisma.user.create({
      data: {
        firstName: registerRequest.firstName.trim(),
        lastName: registerRequest.lastName.trim(),
        email: normalizedEmail,
        passwordHash,
        emailVerified: false,
        businesses: {
          create: {
            name: registerRequest.companyName.trim(),
          },
        },
        emailVerificationTokens: {
          create: {
            tokenHash,
            expiresAt,
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        emailVerified: true,
        businesses: {
          select: {
            id: true,
            name: true,
          },
          take: 1,
        },
      },
    });
    const business = createdUser.businesses[0];

    if (!business) {
      throw new BadRequestException("Business profile could not be created.");
    }

    await this.emailService.sendVerificationEmail({
      email: createdUser.email,
      firstName: createdUser.firstName,
      verificationToken,
    });

    return {
      user: {
        id: createdUser.id,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        email: createdUser.email,
        emailVerified: createdUser.emailVerified,
      },
      business: {
        id: business.id,
        name: business.name,
      },
    };
  }

  async verifyEmail(
    emailVerificationRequest: EmailVerificationRequestDto,
  ): Promise<EmailVerificationResponse> {
    const prisma = this.prismaService.client as unknown as RegistrationPrismaClient;
    const tokenHash = this.emailVerificationTokens.hashToken(emailVerificationRequest.token);
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
      },
    });

    if (!verificationToken || verificationToken.usedAt) {
      throw new NotFoundException("Verification token is invalid.");
    }

    const verifiedAt = new Date();

    if (verificationToken.expiresAt <= verifiedAt) {
      throw new BadRequestException("Verification token has expired.");
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: verificationToken.userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: verifiedAt,
        },
      });
      await transaction.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: verifiedAt },
      });
    });

    return { emailVerified: true };
  }

  async login(loginRequest: LoginRequestDto): Promise<LoginSessionResponse> {
    const normalizedEmail = loginRequest.email.trim().toLowerCase();
    const prisma = this.prismaService.client as unknown as RegistrationPrismaClient;
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        emailVerified: true,
        businesses: {
          select: {
            id: true,
            name: true,
          },
          take: 1,
        },
      },
    });

    if (!user?.passwordHash || !user.email) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const passwordMatches = await this.passwordHasher.comparePassword(
      loginRequest.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    if (!user.emailVerified) {
      throw new ForbiddenException("Email verification is required before login.");
    }

    const claims = {
      sub: user.id,
      email: user.email,
      emailVerified: true,
    } as const;
    const accessToken = await this.jwtSessionTokens.issueAccessToken(claims);
    const refreshToken = await this.jwtSessionTokens.issueRefreshToken(claims);
    const tokenHash = this.jwtSessionTokens.hashRefreshToken(refreshToken);
    const refreshTokenExpiresAt = this.jwtSessionTokens.getRefreshTokenExpiryDate();
    const { accessTokenExpiresIn, refreshTokenExpiresIn } =
      this.jwtSessionConfig.getRequiredConfig();

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: refreshTokenExpiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        emailVerified: true,
      },
      business: user.businesses?.[0] ?? null,
      accessToken,
      accessTokenExpiresIn,
      refreshToken,
      refreshTokenExpiresIn,
    };
  }

  async refreshSession(
    refreshSessionRequest: RefreshSessionRequestDto,
  ): Promise<RefreshSessionResponse> {
    const claims = await this.jwtSessionTokens.verifyRefreshToken(
      refreshSessionRequest.refreshToken,
    );
    const prisma = this.prismaService.client as unknown as RegistrationPrismaClient;
    const tokenHash = this.jwtSessionTokens.hashRefreshToken(refreshSessionRequest.refreshToken);
    const storedRefreshToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (!storedRefreshToken || storedRefreshToken.revokedAt) {
      throw new UnauthorizedException("Refresh token is invalid.");
    }

    if (storedRefreshToken.expiresAt <= new Date()) {
      throw new UnauthorizedException("Refresh token has expired.");
    }

    const user = await prisma.user.findUnique({
      where: { id: storedRefreshToken.userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
      },
    });

    if (!user?.email || !user.emailVerified || user.id !== claims.sub) {
      throw new UnauthorizedException("Refresh token is invalid.");
    }

    const accessToken = await this.jwtSessionTokens.issueAccessToken({
      sub: user.id,
      email: user.email,
      emailVerified: true,
    });
    const { accessTokenExpiresIn } = this.jwtSessionConfig.getRequiredAccessTokenConfig();

    return {
      user: {
        id: user.id,
        email: user.email,
        emailVerified: true,
      },
      accessToken,
      accessTokenExpiresIn,
    };
  }

  async logout(logoutRequest: LogoutRequestDto): Promise<LogoutResponse> {
    await this.jwtSessionTokens.verifyRefreshToken(logoutRequest.refreshToken);
    const prisma = this.prismaService.client as unknown as RegistrationPrismaClient;
    const tokenHash = this.jwtSessionTokens.hashRefreshToken(logoutRequest.refreshToken);
    const storedRefreshToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (!storedRefreshToken || storedRefreshToken.revokedAt) {
      throw new UnauthorizedException("Refresh token is invalid.");
    }

    if (storedRefreshToken.expiresAt <= new Date()) {
      throw new UnauthorizedException("Refresh token has expired.");
    }

    await prisma.refreshToken.update({
      where: { id: storedRefreshToken.id },
      data: { revokedAt: new Date() },
    });

    return { loggedOut: true };
  }

  async getCurrentUser(userId: string): Promise<CurrentUserResponse> {
    const prisma = this.prismaService.client as unknown as RegistrationPrismaClient;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        emailVerified: true,
      },
    });

    if (!user?.email || !user.firstName || !user.lastName || user.emailVerified === undefined) {
      throw new UnauthorizedException("Current user could not be found.");
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
    };
  }

  async changePassword(
    userId: string,
    changePasswordRequest: ChangePasswordRequestDto,
  ): Promise<ChangePasswordResponse> {
    if (changePasswordRequest.newPassword !== changePasswordRequest.confirmNewPassword) {
      throw new BadRequestException("Password confirmation does not match.");
    }

    if (!isPasswordPolicyCompliant(changePasswordRequest.newPassword)) {
      throw new BadRequestException(
        "Password must be at least 12 characters and include uppercase, lowercase, number, and special character.",
      );
    }

    const prisma = this.prismaService.client as unknown as RegistrationPrismaClient;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException("Current user could not be found.");
    }

    const currentPasswordMatches = await this.passwordHasher.comparePassword(
      changePasswordRequest.currentPassword,
      user.passwordHash,
    );

    if (!currentPasswordMatches) {
      throw new UnauthorizedException("Current password is incorrect.");
    }

    const passwordHash = await this.passwordHasher.hashPassword(changePasswordRequest.newPassword);
    const revokedAt = new Date();

    await prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
      await transaction.refreshToken.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
        },
        data: { revokedAt },
      });
    });

    return { passwordChanged: true };
  }

  async requestPasswordReset(
    passwordResetRequest: PasswordResetRequestDto,
  ): Promise<PasswordResetRequestResponse> {
    const normalizedEmail = passwordResetRequest.email.trim().toLowerCase();
    const prisma = this.prismaService.client as unknown as RegistrationPrismaClient;
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        firstName: true,
        email: true,
      },
    });

    if (user?.id && user.email && user.firstName) {
      const resetToken = this.passwordResetTokens.generateToken();
      const tokenHash = this.passwordResetTokens.hashToken(resetToken);
      const expiresAt = this.passwordResetTokens.getExpiryDate();

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
      await this.emailService.sendPasswordResetEmail({
        email: user.email,
        firstName: user.firstName,
        resetToken,
      });
    }

    return { passwordResetRequested: true };
  }

  async confirmPasswordReset(
    passwordResetConfirmationRequest: PasswordResetConfirmationRequestDto,
  ): Promise<PasswordResetConfirmationResponse> {
    if (
      passwordResetConfirmationRequest.password !== passwordResetConfirmationRequest.confirmPassword
    ) {
      throw new BadRequestException("Password confirmation does not match.");
    }

    if (!isPasswordPolicyCompliant(passwordResetConfirmationRequest.password)) {
      throw new BadRequestException(
        "Password must be at least 12 characters and include uppercase, lowercase, number, and special character.",
      );
    }

    const prisma = this.prismaService.client as unknown as RegistrationPrismaClient;
    const tokenHash = this.passwordResetTokens.hashToken(passwordResetConfirmationRequest.token);
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
      },
    });

    if (!resetToken || resetToken.usedAt) {
      throw new NotFoundException("Password reset token is invalid.");
    }

    const resetAt = new Date();

    if (resetToken.expiresAt <= resetAt) {
      throw new BadRequestException("Password reset token has expired.");
    }

    const passwordHash = await this.passwordHasher.hashPassword(
      passwordResetConfirmationRequest.password,
    );

    await prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      });
      await transaction.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: resetAt },
      });
    });

    return { passwordReset: true };
  }
}

function isPublicRegistrationEnabled(): boolean {
  return (process.env.PUBLIC_REGISTRATION_ENABLED ?? "false").trim().toLowerCase() === "true";
}
