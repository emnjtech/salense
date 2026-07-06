import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  SubscriptionInvitationRequestDto,
  SubscriptionPlan,
  SubscriptionPlatform,
} from "../dto/subscription-invitation-request.dto.js";

describe("SubscriptionInvitationRequestDto", () => {
  it("accepts a complete early-access invitation request", async () => {
    const errors = await validate(
      plainToInstance(SubscriptionInvitationRequestDto, {
        businessName: "Northstar Home Goods",
        fullName: "Mia Lewis",
        message: "We sell across several stores and want better channel visibility.",
        phoneNumber: "+44 20 0000 0000",
        platforms: [SubscriptionPlatform.Shopify, SubscriptionPlatform.AmazonSeller],
        preferredPlan: SubscriptionPlan.Professional,
        websiteUrl: "https://northstar.example",
        workEmail: "mia@northstar.example",
      }),
    );

    expect(errors).toEqual([]);
  });

  it("rejects unsupported plans and platform values", async () => {
    const errors = await validate(
      plainToInstance(SubscriptionInvitationRequestDto, {
        businessName: "Northstar Home Goods",
        fullName: "Mia Lewis",
        platforms: ["NOT_A_PLATFORM"],
        preferredPlan: "ENTERPRISE",
        workEmail: "mia@northstar.example",
      }),
    );

    expect(errors.map((error) => error.property).sort()).toEqual(["platforms", "preferredPlan"]);
  });
});
