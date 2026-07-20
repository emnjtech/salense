import { createHash, randomBytes } from "crypto";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { AuditLogService } from "../audit/audit-log.service.js";
import {
  AuditAction,
  AuditLogModule,
  AuditLogResult,
} from "../audit/types/audit-log.type.js";
import { EmailService } from "../email/email.service.js";
import { PrismaService } from "../database/prisma.service.js";
import type { AcceptInvitationRequestDto } from "./dto/accept-invitation-request.dto.js";
import type { ListAdminInvitationsQueryDto } from "./dto/list-admin-invitations-query.dto.js";
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
  SubscriptionInvitationDeleteResponse,
  SubscriptionInvitationApprovalResponse,
  SubscriptionInvitationRejectionResponse,
  SubscriptionInvitationRestoreResponse,
} from "./types/subscription-admin-invitation-response.type.js";
import type { SubscriptionInvitationResponse } from "./types/subscription-invitation-response.type.js";

const INVITATION_STATUS = {
  accepted: "ACCEPTED",
  accountCreated: "ACCOUNT_CREATED",
  active: "ACTIVE",
  approved: "APPROVED",
  archived: "ARCHIVED",
  deleted: "DELETED",
  invitationSent: "INVITATION_SENT",
  pending: "PENDING",
  rejected: "REJECTED",
} as const;

const ACTIVE_INVITATION_STATUSES = new Set([
  INVITATION_STATUS.pending,
  INVITATION_STATUS.approved,
  INVITATION_STATUS.rejected,
  INVITATION_STATUS.invitationSent,
  INVITATION_STATUS.accepted,
  INVITATION_STATUS.accountCreated,
  INVITATION_STATUS.active,
]);

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
  readonly archivedByUserId: string | null;
  readonly deletedAt: Date | null;
  readonly deletedByUserId: string | null;
  readonly statusBeforeArchive: string | null;
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
      readonly where?: Readonly<Record<string, unknown>>;
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
        readonly archivedByUserId: string | null;
        readonly deletedAt: Date | null;
        readonly deletedByUserId: string | null;
        readonly statusBeforeArchive: string | null;
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
  readonly archivedByUserId: true;
  readonly deletedAt: true;
  readonly deletedByUserId: true;
  readonly statusBeforeArchive: true;
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
    @Optional()
    @Inject(AuditLogService)
    private readonly auditLogService?: AuditLogService,
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

    await this.emailService.sendInvitationAcknowledgementEmail({
      businessName: data.businessName,
      email: data.workEmail,
      fullName: data.fullName,
    });

    return {
      invitationId: invitation.id,
      invitationRequested: true,
      preferredPlan: input.preferredPlan,
    };
  }

  async listInvitations(
    query: ListAdminInvitationsQueryDto = {},
  ): Promise<SubscriptionAdminInvitationListResponse> {
    const invitations = await this.prisma.subscriptionInvitation.findMany({
      orderBy: { createdAt: "desc" },
      where: buildInvitationListWhere(query),
      select: invitationRecordSelect,
    });

    return { invitations: invitations.map(toAdminInvitationResponse) };
  }

  async getAdminInvitation(
    invitationId: string,
  ): Promise<{ readonly invitation: SubscriptionAdminInvitationResponse }> {
    return { invitation: toAdminInvitationResponse(await this.getInvitationById(invitationId)) };
  }

  async approveInvitation(
    invitationId: string,
  ): Promise<SubscriptionInvitationApprovalResponse> {
    const invitation = await this.getInvitationById(invitationId);

    if (isAcceptedOrActive(invitation.status) || invitation.invitationTokenUsedAt) {
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
        archivedByUserId: null,
        rejectedAt: null,
        statusBeforeArchive: null,
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

    const sentInvitation = await this.prisma.subscriptionInvitation.update({
      where: { id: approvedInvitation.id },
      data: {
        status: INVITATION_STATUS.invitationSent,
      },
      select: invitationRecordSelect,
    });

    return {
      invitation: toAdminInvitationResponse(sentInvitation),
      invitationLink,
    };
  }

  async rejectInvitation(
    invitationId: string,
  ): Promise<SubscriptionInvitationRejectionResponse> {
    const invitation = await this.getInvitationById(invitationId);

    if (isAcceptedOrActive(invitation.status) || invitation.invitationTokenUsedAt) {
      throw new BadRequestException("Accepted invitations cannot be rejected.");
    }

    const rejectedInvitation = await this.prisma.subscriptionInvitation.update({
      where: { id: invitation.id },
      data: {
        invitationTokenHash: null,
        invitationTokenExpiresAt: null,
        archivedAt: null,
        archivedByUserId: null,
        rejectedAt: new Date(),
        statusBeforeArchive: null,
        status: INVITATION_STATUS.rejected,
      },
      select: invitationRecordSelect,
    });

    return { invitation: toAdminInvitationResponse(rejectedInvitation) };
  }

  async archiveInvitation(invitationId: string, adminId: string) {
    const invitation = await this.getInvitationById(invitationId);
    const now = new Date();

    const archivedInvitation = await this.prisma.subscriptionInvitation.update({
      where: { id: invitation.id },
      data: {
        archivedAt: now,
        archivedByUserId: adminId,
        statusBeforeArchive:
          invitation.status === INVITATION_STATUS.archived
            ? invitation.statusBeforeArchive ?? INVITATION_STATUS.pending
            : invitation.status,
        status: INVITATION_STATUS.archived,
      },
      select: invitationRecordSelect,
    });

    await this.recordInvitationAudit({
      action: AuditAction.InvitationArchived,
      adminId,
      invitation,
      newStatus: INVITATION_STATUS.archived,
      previousStatus: invitation.status,
    });

    return {
      invitation: toAdminInvitationResponse(archivedInvitation),
      message: "Invitation request archived." as const,
    };
  }

  async restoreInvitation(
    invitationId: string,
    adminId: string,
  ): Promise<SubscriptionInvitationRestoreResponse> {
    const invitation = await this.getInvitationById(invitationId);

    if (invitation.status !== INVITATION_STATUS.archived || !invitation.archivedAt) {
      throw new BadRequestException("Only archived invitation requests can be restored.");
    }

    const restoredInvitation = await this.prisma.subscriptionInvitation.update({
      where: { id: invitation.id },
      data: {
        archivedAt: null,
        archivedByUserId: null,
        status: INVITATION_STATUS.pending,
        statusBeforeArchive: null,
      },
      select: invitationRecordSelect,
    });

    await this.recordInvitationAudit({
      action: AuditAction.InvitationRestored,
      adminId,
      invitation,
      newStatus: INVITATION_STATUS.pending,
      previousStatus: invitation.status,
    });

    return {
      invitation: toAdminInvitationResponse(restoredInvitation),
      message: "Invitation request restored.",
    };
  }

  async permanentlyDeleteInvitation(
    invitationId: string,
    confirmation: string,
    adminId: string,
  ): Promise<SubscriptionInvitationDeleteResponse> {
    if (confirmation !== "DELETE") {
      throw new BadRequestException("Type DELETE to permanently delete this invitation request.");
    }

    const invitation = await this.getInvitationById(invitationId);

    if (isLinkedToActiveAccount(invitation)) {
      throw new BadRequestException(
        "This invitation request is linked to an active account and cannot be permanently deleted.",
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: invitation.workEmail },
      select: { id: true },
    });

    if (existingUser) {
      throw new BadRequestException(
        "This invitation request is linked to an active account and cannot be permanently deleted.",
      );
    }

    await this.recordInvitationAudit({
      action: AuditAction.InvitationPermanentlyDeleted,
      adminId,
      invitation,
      newStatus: INVITATION_STATUS.deleted,
      previousStatus: invitation.status,
    });

    await this.prisma.subscriptionInvitation.update({
      where: { id: invitation.id },
      data: {
        deletedAt: new Date(),
        deletedByUserId: adminId,
        status: INVITATION_STATUS.deleted,
      },
      select: invitationRecordSelect,
    });

    return {
      deleted: true,
      message: "Invitation request permanently deleted.",
    };
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
      throw new BadRequestException(
        "Password must be at least 12 characters and include uppercase, lowercase, number, and special character.",
      );
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
          status: INVITATION_STATUS.active,
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

    if (!invitation || invitation.deletedAt) {
      throw new NotFoundException("Invitation request was not found.");
    }

    return invitation;
  }

  private async recordInvitationAudit(input: {
    readonly action: AuditAction;
    readonly adminId: string;
    readonly invitation: InvitationRecord;
    readonly previousStatus: string;
    readonly newStatus: string;
  }): Promise<void> {
    await this.auditLogService?.record({
      action: input.action,
      affectedModule: AuditLogModule.PlatformAdministration,
      businessId: "platform-administration",
      metadata: {
        applicantEmail: input.invitation.workEmail,
        applicantName: input.invitation.fullName,
        businessName: input.invitation.businessName,
        invitationId: input.invitation.id,
        newStatus: input.newStatus,
        previousStatus: input.previousStatus,
      },
      result: AuditLogResult.Success,
      userId: input.adminId,
    });
  }

  private async getValidInvitationByToken(token: string): Promise<InvitationRecord> {
    const invitation = await this.prisma.subscriptionInvitation.findUnique({
      where: { invitationTokenHash: hashInvitationToken(token) },
      select: invitationRecordSelect,
    });
    const now = new Date();

    if (
      !invitation ||
      (invitation.status !== INVITATION_STATUS.approved &&
        invitation.status !== INVITATION_STATUS.invitationSent)
    ) {
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
  archivedByUserId: true,
  deletedAt: true,
  deletedByUserId: true,
  statusBeforeArchive: true,
  invitationTokenExpiresAt: true,
  invitationTokenUsedAt: true,
} satisfies InvitationRecordSelect;

function buildInvitationListWhere(
  query: ListAdminInvitationsQueryDto,
): Readonly<Record<string, unknown>> {
  const conditions: Record<string, unknown>[] = [];
  const archivedView = query.view === "archived";

  conditions.push({ deletedAt: null });

  if (archivedView) {
    conditions.push({ status: INVITATION_STATUS.archived });
  } else {
    conditions.push({ status: { in: [...ACTIVE_INVITATION_STATUSES] } });
  }

  if (query.status?.trim()) {
    conditions.push({ status: query.status.trim().toUpperCase() });
  }

  if (query.preferredPlan?.trim()) {
    conditions.push({ preferredPlan: query.preferredPlan.trim().toUpperCase() });
  }

  if (query.search?.trim()) {
    const search = query.search.trim();

    conditions.push({
      OR: [
        { fullName: { contains: search, mode: "insensitive" } },
        { businessName: { contains: search, mode: "insensitive" } },
        { workEmail: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (query.platform?.trim()) {
    conditions.push({ platforms: { array_contains: query.platform.trim() } });
  }

  const createdRange = buildDateRange(query.submittedFrom, query.submittedTo);
  const archivedRange = buildDateRange(query.archivedFrom, query.archivedTo);

  if (createdRange) {
    conditions.push({ createdAt: createdRange });
  }

  if (archivedRange) {
    conditions.push({ archivedAt: archivedRange });
  }

  return conditions.length === 1 ? conditions[0] ?? {} : { AND: conditions };
}

function buildDateRange(
  from: string | undefined,
  to: string | undefined,
): Readonly<Record<string, Date>> | null {
  const range: Record<string, Date> = {};
  const fromDate = parseDate(from);
  const toDate = parseDate(to);

  if (fromDate) {
    range.gte = fromDate;
  }

  if (toDate) {
    toDate.setHours(23, 59, 59, 999);
    range.lte = toDate;
  }

  return Object.keys(range).length > 0 ? range : null;
}

function parseDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

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
    archivedByUserId: record.archivedByUserId,
    businessName: record.businessName,
    createdAt: record.createdAt.toISOString(),
    deletedAt: toIsoString(record.deletedAt),
    deletedByUserId: record.deletedByUserId,
    fullName: record.fullName,
    id: record.id,
    invitationTokenExpiresAt: toIsoString(record.invitationTokenExpiresAt),
    invitationTokenUsedAt: toIsoString(record.invitationTokenUsedAt),
    linkedActiveAccount: isLinkedToActiveAccount(record),
    message: record.message,
    phoneNumber: record.phoneNumber,
    platforms: Array.isArray(record.platforms)
      ? record.platforms.filter((platform): platform is string => typeof platform === "string")
      : [],
    preferredPlan: record.preferredPlan,
    rejectedAt: toIsoString(record.rejectedAt),
    status: record.status,
    statusBeforeArchive: record.statusBeforeArchive,
    updatedAt: record.updatedAt.toISOString(),
    websiteUrl: record.websiteUrl,
    workEmail: record.workEmail,
  };
}

function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function isAcceptedOrActive(status: string): boolean {
  return (
    status === INVITATION_STATUS.accepted ||
    status === INVITATION_STATUS.accountCreated ||
    status === INVITATION_STATUS.active
  );
}

function isLinkedToActiveAccount(record: InvitationRecord): boolean {
  return isAcceptedOrActive(record.status) || Boolean(record.invitationTokenUsedAt);
}

function createInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
