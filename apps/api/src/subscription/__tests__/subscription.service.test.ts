import { BadRequestException } from "@nestjs/common";
import type { PrismaService } from "../../database/prisma.service.js";
import type { EmailService } from "../../email/email.service.js";
import type { BcryptPasswordHasherService } from "../../auth/security/index.js";
import {
  SubscriptionPlan,
  SubscriptionPlatform,
} from "../dto/subscription-invitation-request.dto.js";
import { SubscriptionService } from "../subscription.service.js";

const baseInvitation = {
  approvedAt: null,
  archivedAt: null,
  businessName: "Northstar Home Goods",
  createdAt: new Date("2026-07-06T10:00:00.000Z"),
  fullName: "Mia Lewis",
  id: "invitation_1",
  invitationTokenExpiresAt: null,
  invitationTokenUsedAt: null,
  message: "Interested in channel intelligence.",
  phoneNumber: "+44 20 0000 0000",
  platforms: [SubscriptionPlatform.Shopify, SubscriptionPlatform.WooCommerce],
  preferredPlan: SubscriptionPlan.Professional,
  rejectedAt: null,
  status: "PENDING",
  updatedAt: new Date("2026-07-06T10:00:00.000Z"),
  websiteUrl: "https://northstar.example",
  workEmail: "mia@northstar.example",
};

function createService() {
  const create = jest.fn();
  const findMany = jest.fn();
  const findInvitationUnique = jest.fn();
  const updateInvitation = jest.fn();
  const findUserUnique = jest.fn();
  const createUser = jest.fn();
  const transaction = jest.fn(async (callback: (client: unknown) => Promise<unknown>) =>
    callback({
      subscriptionInvitation: { update: updateInvitation },
      user: { create: createUser, findUnique: findUserUnique },
    }),
  );
  const hashPassword = jest.fn();
  const sendInvitationEmail = jest.fn();
  const service = new SubscriptionService(
    {
      client: {
        $transaction: transaction,
        subscriptionInvitation: {
          create,
          findMany,
          findUnique: findInvitationUnique,
          update: updateInvitation,
        },
        user: {
          create: createUser,
          findUnique: findUserUnique,
        },
      },
    } as unknown as PrismaService,
    { hashPassword } as unknown as BcryptPasswordHasherService,
    { sendInvitationEmail } as unknown as EmailService,
  );

  return {
    create,
    createUser,
    findInvitationUnique,
    findMany,
    findUserUnique,
    hashPassword,
    sendInvitationEmail,
    service,
    transaction,
    updateInvitation,
  };
}

describe("SubscriptionService", () => {
  beforeEach(() => {
    process.env.PLATFORM_ADMIN_EMAIL = "admin@salense.local";
  });

  it("stores a normalised pending invitation request and returns a safe confirmation", async () => {
    const mocks = createService();
    mocks.create.mockResolvedValue({
      id: "invitation_1",
      preferredPlan: SubscriptionPlan.Professional,
    });

    await expect(
      mocks.service.requestInvitation({
        businessName: " Northstar Home Goods ",
        fullName: " Mia Lewis ",
        message: " Interested in channel intelligence. ",
        phoneNumber: " +44 20 0000 0000 ",
        platforms: [SubscriptionPlatform.Shopify, SubscriptionPlatform.WooCommerce],
        preferredPlan: SubscriptionPlan.Professional,
        websiteUrl: " https://northstar.example ",
        workEmail: " MIA@Northstar.Example ",
      }),
    ).resolves.toEqual({
      invitationId: "invitation_1",
      invitationRequested: true,
      preferredPlan: SubscriptionPlan.Professional,
    });

    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        businessName: "Northstar Home Goods",
        fullName: "Mia Lewis",
        message: "Interested in channel intelligence.",
        phoneNumber: "+44 20 0000 0000",
        platforms: [SubscriptionPlatform.Shopify, SubscriptionPlatform.WooCommerce],
        preferredPlan: SubscriptionPlan.Professional,
        status: "PENDING",
        websiteUrl: "https://northstar.example",
        workEmail: "mia@northstar.example",
      },
      select: {
        id: true,
        preferredPlan: true,
      },
    });
  });

  it("lists invitations without token hashes", async () => {
    const mocks = createService();
    mocks.findMany.mockResolvedValue([baseInvitation]);

    await expect(mocks.service.listInvitations()).resolves.toEqual({
      invitations: [
        expect.objectContaining({
          businessName: "Northstar Home Goods",
          id: "invitation_1",
          status: "PENDING",
          workEmail: "mia@northstar.example",
        }),
      ],
    });
    expect(JSON.stringify(await mocks.service.listInvitations())).not.toContain("tokenHash");
  });

  it("approves an invitation with a hashed single-use token and returns the link once", async () => {
    const mocks = createService();
    mocks.findInvitationUnique.mockResolvedValue(baseInvitation);
    mocks.updateInvitation.mockResolvedValue({
      ...baseInvitation,
      approvedAt: new Date("2026-07-06T11:00:00.000Z"),
      invitationTokenExpiresAt: new Date("2026-07-13T11:00:00.000Z"),
      status: "APPROVED",
    });

    const response = await mocks.service.approveInvitation("invitation_1");

    expect(response.invitation.status).toBe("APPROVED");
    expect(response.invitationLink).toContain("/accept-invitation?token=");
    expect(mocks.updateInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          invitationTokenHash: expect.any(String),
          status: "APPROVED",
        }),
      }),
    );
    expect(JSON.stringify(response)).not.toContain("invitationTokenHash");
    expect(mocks.sendInvitationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "mia@northstar.example",
        invitationLink: response.invitationLink,
      }),
    );
  });

  it("rejects an invitation and clears any pending token state", async () => {
    const mocks = createService();
    mocks.findInvitationUnique.mockResolvedValue(baseInvitation);
    mocks.updateInvitation.mockResolvedValue({
      ...baseInvitation,
      rejectedAt: new Date("2026-07-06T11:00:00.000Z"),
      status: "REJECTED",
    });

    await expect(
      mocks.service.rejectInvitation("invitation_1"),
    ).resolves.toEqual({
      invitation: expect.objectContaining({ id: "invitation_1", status: "REJECTED" }),
    });
    expect(mocks.updateInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          invitationTokenExpiresAt: null,
          invitationTokenHash: null,
          status: "REJECTED",
        }),
      }),
    );
  });

  it("archives a completed invitation", async () => {
    const mocks = createService();
    mocks.findInvitationUnique.mockResolvedValue({
      ...baseInvitation,
      status: "REJECTED",
    });
    mocks.updateInvitation.mockResolvedValue({
      ...baseInvitation,
      archivedAt: new Date("2026-07-06T12:00:00.000Z"),
      status: "ARCHIVED",
    });

    await expect(mocks.service.archiveInvitation("invitation_1")).resolves.toEqual({
      invitation: expect.objectContaining({ id: "invitation_1", status: "ARCHIVED" }),
    });
  });

  it("prevents archiving pending invitation requests", async () => {
    const mocks = createService();
    mocks.findInvitationUnique.mockResolvedValue(baseInvitation);

    await expect(mocks.service.archiveInvitation("invitation_1")).rejects.toThrow(
      BadRequestException,
    );
    expect(mocks.updateInvitation).not.toHaveBeenCalled();
  });

  it("creates a verified account from a valid invitation and marks the token used", async () => {
    const mocks = createService();
    mocks.findInvitationUnique.mockResolvedValue({
      ...baseInvitation,
      invitationTokenExpiresAt: new Date(Date.now() + 60_000),
      status: "APPROVED",
    });
    mocks.findUserUnique.mockResolvedValue(null);
    mocks.hashPassword.mockResolvedValue("hashed-password");
    mocks.createUser.mockResolvedValue({
      businesses: [{ name: "Northstar Home Goods" }],
      email: "mia@northstar.example",
    });
    mocks.updateInvitation.mockResolvedValue({
      ...baseInvitation,
      invitationTokenUsedAt: new Date(),
      status: "ACCEPTED",
    });

    await expect(
      mocks.service.acceptInvitation({
        confirmPassword: "Password123!",
        firstName: "Mia",
        lastName: "Lewis",
        password: "Password123!",
        token: "raw-invitation-token",
      }),
    ).resolves.toEqual({
      accountCreated: true,
      businessName: "Northstar Home Goods",
      email: "mia@northstar.example",
    });

    expect(mocks.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "mia@northstar.example",
          emailVerified: true,
          passwordHash: "hashed-password",
        }),
      }),
    );
    expect(mocks.updateInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          invitationTokenUsedAt: expect.any(Date),
          status: "ACCEPTED",
        }),
      }),
    );
  });

  it("prevents invitation token reuse", async () => {
    const mocks = createService();
    mocks.findInvitationUnique.mockResolvedValue({
      ...baseInvitation,
      invitationTokenExpiresAt: new Date(Date.now() + 60_000),
      invitationTokenUsedAt: new Date(),
      status: "APPROVED",
    });

    await expect(
      mocks.service.acceptInvitation({
        confirmPassword: "Password123!",
        firstName: "Mia",
        lastName: "Lewis",
        password: "Password123!",
        token: "raw-invitation-token",
      }),
    ).rejects.toThrow(BadRequestException);
    expect(mocks.createUser).not.toHaveBeenCalled();
  });
});
