import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from "@nestjs/common";
import { EmailService } from "../email/email.service.js";
import { PrismaService } from "../database/prisma.service.js";
import type { EmailVerificationRequestDto } from "./dto/email-verification-request.dto.js";
import type { LoginRequestDto } from "./dto/login-request.dto.js";
import type { PasswordResetRequestDto } from "./dto/password-reset-request.dto.js";
import type { RegisterRequestDto } from "./dto/register-request.dto.js";
import {
  BcryptPasswordHasherService,
  EmailVerificationTokenService,
  isPasswordPolicyCompliant,
} from "./security/index.js";
import type { EmailVerificationResponse } from "./types/email-verification-response.type.js";
import type { RegistrationResponse } from "./types/registration-response.type.js";

interface RegistrationPrismaClient {
  readonly user: {
    findUnique(args: {
      readonly where: { readonly email: string };
    }): Promise<{ readonly id: string } | null>;
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
      readonly data: { readonly emailVerified: true; readonly emailVerifiedAt: Date };
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
    @Inject(EmailService) private readonly emailService: EmailService,
  ) {}

  async register(registerRequest: RegisterRequestDto): Promise<RegistrationResponse> {
    if (registerRequest.password !== registerRequest.confirmPassword) {
      throw new BadRequestException("Password confirmation does not match.");
    }

    if (!isPasswordPolicyCompliant(registerRequest.password)) {
      throw new BadRequestException("Password does not meet Chapter 6.1 requirements.");
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

  login(loginRequest: LoginRequestDto): never {
    void loginRequest;
    throw new NotImplementedException("Login is not implemented in the Phase 1 skeleton.");
  }

  requestPasswordReset(passwordResetRequest: PasswordResetRequestDto): never {
    void passwordResetRequest;
    throw new NotImplementedException("Password reset is not implemented in the Phase 1 skeleton.");
  }
}
