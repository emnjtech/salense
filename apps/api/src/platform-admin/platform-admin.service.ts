import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import {
  BcryptPasswordHasherService,
  isPasswordPolicyCompliant,
} from "../auth/security/index.js";

export interface CreatePlatformAdminInput {
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly password: string;
}

export interface PlatformAdminCreationResponse {
  readonly id: string;
  readonly email: string;
  readonly role: "SUPER_ADMIN";
  readonly status: "ACTIVE";
}

interface PlatformAdminManagementPrismaClient {
  readonly platformAdmin: {
    upsert(args: {
      readonly where: { readonly email: string };
      readonly update: {
        readonly firstName: string;
        readonly lastName: string;
        readonly passwordHash: string;
        readonly role: "SUPER_ADMIN";
        readonly status: "ACTIVE";
      };
      readonly create: {
        readonly email: string;
        readonly firstName: string;
        readonly lastName: string;
        readonly passwordHash: string;
        readonly role: "SUPER_ADMIN";
        readonly status: "ACTIVE";
      };
      readonly select: {
        readonly email: true;
        readonly id: true;
        readonly role: true;
        readonly status: true;
      };
    }): Promise<PlatformAdminCreationResponse>;
  };
}

@Injectable()
export class PlatformAdminService {
  private readonly prisma: PlatformAdminManagementPrismaClient;

  constructor(
    @Inject(PrismaService) prismaService: PrismaService,
    @Inject(BcryptPasswordHasherService)
    private readonly passwordHasher: BcryptPasswordHasherService,
  ) {
    this.prisma = prismaService.client as unknown as PlatformAdminManagementPrismaClient;
  }

  async createPlatformAdmin(
    input: CreatePlatformAdminInput,
  ): Promise<PlatformAdminCreationResponse> {
    const email = input.email.trim().toLowerCase();
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();

    if (!email || !firstName || !lastName) {
      throw new BadRequestException("Admin email, first name, and last name are required.");
    }

    if (!isPasswordPolicyCompliant(input.password)) {
      throw new BadRequestException(
        "Admin password must be at least 12 characters and include uppercase, lowercase, number, and symbol.",
      );
    }

    const passwordHash = await this.passwordHasher.hashPassword(input.password);

    return this.prisma.platformAdmin.upsert({
      where: { email },
      update: {
        firstName,
        lastName,
        passwordHash,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      },
      create: {
        email,
        firstName,
        lastName,
        passwordHash,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      },
      select: {
        email: true,
        id: true,
        role: true,
        status: true,
      },
    });
  }
}
