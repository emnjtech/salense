import type { PrismaService } from "../../database/prisma.service.js";
import {
  SubscriptionPlan,
  SubscriptionPlatform,
} from "../dto/subscription-invitation-request.dto.js";
import { SubscriptionService } from "../subscription.service.js";

describe("SubscriptionService", () => {
  it("stores a normalised invitation request and returns a safe confirmation", async () => {
    const create = jest.fn().mockResolvedValue({
      id: "invitation_1",
      preferredPlan: SubscriptionPlan.Professional,
    });
    const service = new SubscriptionService({
      client: { subscriptionInvitation: { create } },
    } as unknown as PrismaService);

    await expect(
      service.requestInvitation({
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

    expect(create).toHaveBeenCalledWith({
      data: {
        businessName: "Northstar Home Goods",
        fullName: "Mia Lewis",
        message: "Interested in channel intelligence.",
        phoneNumber: "+44 20 0000 0000",
        platforms: [SubscriptionPlatform.Shopify, SubscriptionPlatform.WooCommerce],
        preferredPlan: SubscriptionPlan.Professional,
        websiteUrl: "https://northstar.example",
        workEmail: "mia@northstar.example",
      },
      select: {
        id: true,
        preferredPlan: true,
      },
    });
  });
});
