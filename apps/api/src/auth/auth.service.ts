import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotImplementedException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import type { EmailVerificationRequestDto } from "./dto/email-verification-request.dto.js";
import type { LoginRequestDto } from "./dto/login-request.dto.js";
import type { PasswordResetRequestDto } from "./dto/password-reset-request.dto.js";
import type { RegisterRequestDto } from "./dto/register-request.dto.js";
import { BcryptPasswordHasherService, isPasswordPolicyCompliant } from "./security/index.js";
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
  };
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(BcryptPasswordHasherService)
    private readonly passwordHasher: BcryptPasswordHasherService,
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

  login(loginRequest: LoginRequestDto): never {
    void loginRequest;
    throw new NotImplementedException("Login is not implemented in the Phase 1 skeleton.");
  }

  verifyEmail(emailVerificationRequest: EmailVerificationRequestDto): never {
    void emailVerificationRequest;
    throw new NotImplementedException(
      "Email verification is not implemented in the Phase 1 skeleton.",
    );
  }

  requestPasswordReset(passwordResetRequest: PasswordResetRequestDto): never {
    void passwordResetRequest;
    throw new NotImplementedException("Password reset is not implemented in the Phase 1 skeleton.");
  }
}
