import { createHash, randomBytes } from "crypto";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EmailService } from "../email/email.service.js";
import { PrismaService } from "../database/prisma.service.js";
import type { AcceptInvitationRequestDto } from "./dto/accept-invitation-request.dto.js";
import type { SubscriptionInvitationRequestDto } from "./dto/subscription-invitation-request.dto.js";
import {
  BcryptPasswordHasherService,
  isPasswordPolicyCompliant,
} from "../auth/security/index.js";
import type {
  InvitationAccountCreationResponse,
  InvitationContextResponse,
} from "./types/invitation-account-response.type.js";
import type {
  SubscriptionAdminInvitationListResponse,
  SubscriptionAdminInvitationResponse,
  SubscriptionInvitationApprovalResponse,
  SubscriptionInvitationRejectionResponse,
} from "./types/subscription-admin-invitation-response.type.js";
import type { SubscriptionInvitationResponse } from "./types/subscription-invitation-response.type.js";

const INVITATION_STATUS = {
  accepted: "ACCEPTED",
  approved: "APPROVED",
  archived: "ARCHIVED",
  pending: "PENDING",
  rejected: "REJECTED",
} as const;

const INVITATION_TOKEN_EXPIRY_DAYS = 7;

interface InvitationRecord {
  readonly id: string;
  readonly businessName: string;
  readonly fullName: string;
  readonly workEmail: string;
  readonly phoneNumber: string | null;
  readonly websiteUrl: string | null;
  readonly preferredPlan: string;
  readonly platforms: unknown;
  readonly message: string | null;
  readonly status: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly approvedAt: Date | null;
  readonly rejectedAt: Date | null;
  readonly archivedAt: Date | null;
  readonly invitationTokenExpiresAt: Date | null;
  readonly invitationTokenUsedAt: Date | null;
}

interface SubscriptionPrismaClient {
  readonly subscriptionInvitation: {
    create(args: {
      readonly data: {
        readonly fullName: string;
        readonly businessName: string;
        readonly workEmail: string;
        readonly phoneNumber?: string;
        readonly websiteUrl?: string;
        readonly preferredPlan: string;
        readonly platforms: readonly string[];
        readonly message?: string;
        readonly status: string;
      };
      readonly select: {
        readonly id: true;
        readonly preferredPlan: true;
      };
    }): Promise<{ readonly id: string; readonly preferredPlan: string }>;
    findMany(args: {
      readonly orderBy: { readonly createdAt: "desc" };
      readonly select: InvitationRecordSelect;
    }): Promise<InvitationRecord[]>;
    findUnique(args: {
      readonly where: { readonly id: string } | { readonly invitationTokenHash: string };
      readonly select: InvitationRecordSelect;
    }): Promise<InvitationRecord | null>;
    update(args: {
      readonly where: { readonly id: string };
      readonly data: Partial<{
        readonly status: string;
        readonly invitationTokenHash: string | null;
        readonly invitationTokenExpiresAt: Date | null;
        readonly invitationTokenUsedAt: Date | null;
        readonly approvedAt: Date | null;
        readonly rejectedAt: Date | null;
        readonly archivedAt: Date | null;
      }>;
      readonly select: InvitationRecordSelect;
    }): Promise<InvitationRecord>;
  };
  readonly user: {
    findUnique(args: {
      readonly where: { readonly email: string };
      readonly select: { readonly id: true };
    }): Promise<{ readonly id: string } | null>;
    create(args: {
      readonly data: {
        readonly firstName: string;
        readonly lastName: string;
        readonly email: string;
        readonly passwordHash: string;
        readonly emailVerified: true;
        readonly emailVerifiedAt: Date;
        readonly businesses: {
          readonly create: {
            readonly name: string;
          };
        };
      };
      readonly select: {
        readonly email: true;
        readonly businesses: {
          readonly select: { readonly name: true };
          readonly take: 1;
        };
      };
    }): Promise<{
      readonly email: string;
      readonly businesses: readonly { readonly name: string }[];
    }>;
  };
  $transaction<T>(callback: (transaction: SubscriptionPrismaClient) => Promise<T>): Promise<T>;
}

interface InvitationRecordSelect {
  readonly id: true;
  readonly businessName: true;
  readonly fullName: true;
  readonly workEmail: true;
  readonly phoneNumber: true;
  readonly websiteUrl: true;
  readonly preferredPlan: true;
  readonly platforms: true;
  readonly message: true;
  readonly status: true;
  readonly createdAt: true;
  readonly updatedAt: true;
  readonly approvedAt: true;
  readonly rejectedAt: true;
  readonly archivedAt: true;
  readonly invitationTokenExpiresAt: true;
  readonly invitationTokenUsedAt: true;
}

interface OptionalInvitationFields {
  readonly message?: string;
  readonly phoneNumber?: string;
  readonly websiteUrl?: string;
}

@Injectable()
export class SubscriptionService {
  private readonly prisma: SubscriptionPrismaClient;

  constructor(
    @Inject(PrismaService) prismaService: PrismaService,
    @Inject(BcryptPasswordHasherService)
    private readonly passwordHasher: BcryptPasswordHasherService,
    @Inject(EmailService) private readonly emailService: EmailService,
  ) {
    this.prisma = prismaService.client as unknown as SubscriptionPrismaClient;
  }

  async requestInvitation(
    input: SubscriptionInvitationRequestDto,
  ): Promise<SubscriptionInvitationResponse> {
    const data = {
      businessName: normaliseRequiredText(input.businessName),
      fullName: normaliseRequiredText(input.fullName),
      platforms: input.platforms,
      preferredPlan: input.preferredPlan,
      status: INVITATION_STATUS.pending,
      workEmail: input.workEmail.trim().toLowerCase(),
      ...toOptionalField("message", input.message),
      ...toOptionalField("phoneNumber", input.phoneNumber),
      ...toOptionalField("websiteUrl", input.websiteUrl),
    };

    const invitation = await this.prisma.subscriptionInvitation.create({
      data,
      select: {
        id: true,
        preferredPlan: true,
      },
    });

    return {
      invitationId: invitation.id,
      invitationRequested: true,
      preferredPlan: input.preferredPlan,
    };
  }

  async listInvitations(): Promise<SubscriptionAdminInvitationListResponse> {
    const invitations = await this.prisma.subscriptionInvitation.findMany({
      orderBy: { createdAt: "desc" },
      select: invitationRecordSelect,
    });

    return { invitations: invitations.map(toAdminInvitationResponse) };
  }

  async approveInvitation(
    invitationId: string,
  ): Promise<SubscriptionInvitationApprovalResponse> {
    const invitation = await this.getInvitationById(invitationId);

    if (invitation.status === INVITATION_STATUS.accepted || invitation.invitationTokenUsedAt) {
      throw new BadRequestException("This invitation has already been accepted.");
    }

    if (invitation.status === INVITATION_STATUS.rejected) {
      throw new BadRequestException("Rejected invitations cannot be approved.");
    }

    const token = createInvitationToken();
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + INVITATION_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );
    const approvedInvitation = await this.prisma.subscriptionInvitation.update({
      where: { id: invitation.id },
      data: {
        approvedAt: now,
        invitationTokenExpiresAt: expiresAt,
        invitationTokenHash: hashInvitationToken(token),
        invitationTokenUsedAt: null,
        archivedAt: null,
        rejectedAt: null,
        status: INVITATION_STATUS.approved,
      },
      select: invitationRecordSelect,
    });
    const invitationLink = `/accept-invitation?token=${encodeURIComponent(token)}`;

    await this.emailService.sendInvitationEmail({
      businessName: approvedInvitation.businessName,
      email: approvedInvitation.workEmail,
      fullName: approvedInvitation.fullName,
      invitationLink,
    });

    return {
      invitation: toAdminInvitationResponse(approvedInvitation),
      invitationLink,
    };
  }

  async rejectInvitation(
    invitationId: string,
  ): Promise<SubscriptionInvitationRejectionResponse> {
    const invitation = await this.getInvitationById(invitationId);

    if (invitation.status === INVITATION_STATUS.accepted || invitation.invitationTokenUsedAt) {
      throw new BadRequestException("Accepted invitations cannot be rejected.");
    }

    const rejectedInvitation = await this.prisma.subscriptionInvitation.update({
      where: { id: invitation.id },
      data: {
        invitationTokenHash: null,
        invitationTokenExpiresAt: null,
        archivedAt: null,
        rejectedAt: new Date(),
        status: INVITATION_STATUS.rejected,
      },
      select: invitationRecordSelect,
    });

    return { invitation: toAdminInvitationResponse(rejectedInvitation) };
  }

  async archiveInvitation(invitationId: string) {
    const invitation = await this.getInvitationById(invitationId);

    if (invitation.status === INVITATION_STATUS.pending) {
      throw new BadRequestException("Pending invitations must be approved or rejected before archiving.");
    }

    const archivedInvitation = await this.prisma.subscriptionInvitation.update({
      where: { id: invitation.id },
      data: {
        archivedAt: new Date(),
        status: INVITATION_STATUS.archived,
      },
      select: invitationRecordSelect,
    });

    return { invitation: toAdminInvitationResponse(archivedInvitation) };
  }

  async getInvitationContext(token: string): Promise<InvitationContextResponse> {
    const invitation = await this.getValidInvitationByToken(token);

    return {
      valid: true,
      businessName: invitation.businessName,
      fullName: invitation.fullName,
      preferredPlan: invitation.preferredPlan,
      workEmail: invitation.workEmail,
    };
  }

  async acceptInvitation(
    input: AcceptInvitationRequestDto,
  ): Promise<InvitationAccountCreationResponse> {
    if (input.password !== input.confirmPassword) {
      throw new BadRequestException("Password confirmation does not match.");
    }

    if (!isPasswordPolicyCompliant(input.password)) {
      throw new BadRequestException("Password does not meet Chapter 6.1 requirements.");
    }

    const invitation = await this.getValidInvitationByToken(input.token);
    const existingUser = await this.prisma.user.findUnique({
      where: { email: invitation.workEmail },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException("An account already exists for this invitation email.");
    }

    const passwordHash = await this.passwordHasher.hashPassword(input.password);
    const acceptedAt = new Date();

    const createdUser = await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          businesses: {
            create: {
              name: invitation.businessName,
            },
          },
          email: invitation.workEmail,
          emailVerified: true,
          emailVerifiedAt: acceptedAt,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          passwordHash,
        },
        select: {
          email: true,
          businesses: {
            select: { name: true },
            take: 1,
          },
        },
      });

      await transaction.subscriptionInvitation.update({
        where: { id: invitation.id },
        data: {
          invitationTokenUsedAt: acceptedAt,
          status: INVITATION_STATUS.accepted,
        },
        select: invitationRecordSelect,
      });

      return user;
    });

    return {
      accountCreated: true,
      businessName: createdUser.businesses[0]?.name ?? invitation.businessName,
      email: createdUser.email,
    };
  }

  private async getInvitationById(invitationId: string): Promise<InvitationRecord> {
    const invitation = await this.prisma.subscriptionInvitation.findUnique({
      where: { id: invitationId },
      select: invitationRecordSelect,
    });

    if (!invitation) {
      throw new NotFoundException("Invitation request was not found.");
    }

    return invitation;
  }

  private async getValidInvitationByToken(token: string): Promise<InvitationRecord> {
    const invitation = await this.prisma.subscriptionInvitation.findUnique({
      where: { invitationTokenHash: hashInvitationToken(token) },
      select: invitationRecordSelect,
    });
    const now = new Date();

    if (!invitation || invitation.status !== INVITATION_STATUS.approved) {
      throw new NotFoundException("Invitation link is invalid.");
    }

    if (invitation.invitationTokenUsedAt) {
      throw new BadRequestException("Invitation link has already been used.");
    }

    if (!invitation.invitationTokenExpiresAt || invitation.invitationTokenExpiresAt <= now) {
      throw new BadRequestException("Invitation link has expired.");
    }

    return invitation;
  }
}

const invitationRecordSelect = {
  id: true,
  businessName: true,
  fullName: true,
  workEmail: true,
  phoneNumber: true,
  websiteUrl: true,
  preferredPlan: true,
  platforms: true,
  message: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
  rejectedAt: true,
  archivedAt: true,
  invitationTokenExpiresAt: true,
  invitationTokenUsedAt: true,
} satisfies InvitationRecordSelect;

function normaliseRequiredText(value: string): string {
  return value.trim();
}

function normaliseOptionalText(value: string | undefined): string | undefined {
  const normalised = value?.trim();

  return normalised ? normalised : undefined;
}

function toOptionalField(
  key: keyof OptionalInvitationFields,
  value: string | undefined,
): OptionalInvitationFields {
  const normalised = normaliseOptionalText(value);

  return normalised ? { [key]: normalised } : {};
}

function toAdminInvitationResponse(record: InvitationRecord): SubscriptionAdminInvitationResponse {
  return {
    approvedAt: toIsoString(record.approvedAt),
    archivedAt: toIsoString(record.archivedAt),
    businessName: record.businessName,
    createdAt: record.createdAt.toISOString(),
    fullName: record.fullName,
    id: record.id,
    invitationTokenExpiresAt: toIsoString(record.invitationTokenExpiresAt),
    invitationTokenUsedAt: toIsoString(record.invitationTokenUsedAt),
    message: record.message,
    phoneNumber: record.phoneNumber,
    platforms: Array.isArray(record.platforms)
      ? record.platforms.filter((platform): platform is string => typeof platform === "string")
      : [],
    preferredPlan: record.preferredPlan,
    rejectedAt: toIsoString(record.rejectedAt),
    status: record.status,
    updatedAt: record.updatedAt.toISOString(),
    websiteUrl: record.websiteUrl,
    workEmail: record.workEmail,
  };
}

function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function createInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
