import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import type { SubscriptionInvitationRequestDto } from "./dto/subscription-invitation-request.dto.js";
import type { SubscriptionInvitationResponse } from "./types/subscription-invitation-response.type.js";

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
      };
      readonly select: {
        readonly id: true;
        readonly preferredPlan: true;
      };
    }): Promise<{ readonly id: string; readonly preferredPlan: string }>;
  };
}

type OptionalInvitationFields = Partial<{
  readonly message: string;
  readonly phoneNumber: string;
  readonly websiteUrl: string;
}>;

@Injectable()
export class SubscriptionService {
  private readonly prisma: SubscriptionPrismaClient;

  constructor(@Inject(PrismaService) prismaService: PrismaService) {
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
