import { SubscriptionPlan, SubscriptionPlatform } from "../../components/subscription/subscription-plans";
import { createSubscriptionApiClient } from "../api/subscription-client";

describe("subscription API client", () => {
  it("posts invitation requests to the subscription endpoint", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(
        jsonResponse({
          invitationId: "invitation_1",
          invitationRequested: true,
          preferredPlan: SubscriptionPlan.Professional,
        }),
      );
    const client = createSubscriptionApiClient({
      baseUrl: "https://api.salense.test/",
      fetchImpl,
    });

    await expect(
      client.requestInvitation({
        businessName: "Northstar Home Goods",
        fullName: "Mia Lewis",
        platforms: [SubscriptionPlatform.Shopify, SubscriptionPlatform.AmazonSeller],
        preferredPlan: SubscriptionPlan.Professional,
        workEmail: "mia@northstar.example",
      }),
    ).resolves.toMatchObject({
      invitationRequested: true,
      preferredPlan: SubscriptionPlan.Professional,
    });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://api.salense.test/subscription/invitations",
    );
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
    });
    expect(new Headers(fetchImpl.mock.calls[0]?.[1]?.headers).get("content-type")).toBe(
      "application/json",
    );
  });

  it("maps invitation request errors to friendly client errors", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ message: ["workEmail must be an email"] }, false, 400));
    const client = createSubscriptionApiClient({ baseUrl: "https://api.salense.test", fetchImpl });

    await expect(
      client.requestInvitation({
        businessName: "Northstar Home Goods",
        fullName: "Mia Lewis",
        platforms: [SubscriptionPlatform.Shopify],
        preferredPlan: SubscriptionPlan.Starter,
        workEmail: "not-an-email",
      }),
    ).rejects.toThrow("workEmail must be an email");
  });

  it("fetches admin invitation requests from the protected endpoint", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(
        jsonResponse({
          invitations: [
            {
              approvedAt: null,
              archivedAt: null,
              businessName: "Northstar Home Goods",
              createdAt: "2026-07-06T10:00:00.000Z",
              fullName: "Mia Lewis",
              id: "invitation_1",
              invitationTokenExpiresAt: null,
              invitationTokenUsedAt: null,
              message: null,
              phoneNumber: null,
              platforms: [SubscriptionPlatform.Shopify],
              preferredPlan: SubscriptionPlan.Professional,
              rejectedAt: null,
              status: "PENDING",
              updatedAt: "2026-07-06T10:00:00.000Z",
              websiteUrl: null,
              workEmail: "mia@northstar.example",
            },
          ],
        }),
      );
    const client = createSubscriptionApiClient({ baseUrl: "https://api.salense.test", fetchImpl });

    await expect(client.listInvitations("access.jwt.token")).resolves.toMatchObject({
      invitations: [{ id: "invitation_1", status: "PENDING" }],
    });
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://api.salense.test/subscription/invitations/admin",
    );
    expect(new Headers(fetchImpl.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(
      "Bearer access.jwt.token",
    );
  });

  it("accepts an invitation token through the public endpoint", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(
        jsonResponse({
          accountCreated: true,
          businessName: "Northstar Home Goods",
          email: "mia@northstar.example",
        }),
      );
    const client = createSubscriptionApiClient({ baseUrl: "https://api.salense.test", fetchImpl });

    await expect(
      client.acceptInvitation({
        confirmPassword: "Password123!",
        firstName: "Mia",
        lastName: "Lewis",
        password: "Password123!",
        token: "raw-token",
      }),
    ).resolves.toMatchObject({
      accountCreated: true,
      email: "mia@northstar.example",
    });
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://api.salense.test/subscription/invitations/accept",
    );
  });
});

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    json: async () => body,
    ok,
    status,
  } as Response;
}
