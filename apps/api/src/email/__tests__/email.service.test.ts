import {
  isResendEmailConfigured,
  PlaceholderEmailService,
  ResendEmailService,
} from "../email.service.js";

describe("PlaceholderEmailService", () => {
  it("stores outgoing verification requests for tests without sending email", async () => {
    const service = new PlaceholderEmailService();

    await service.sendVerificationEmail({
      email: "sarah@example.com",
      firstName: "Sarah",
      verificationToken: "raw-token",
    });

    expect(service.getVerificationRequests()).toEqual([
      {
        email: "sarah@example.com",
        firstName: "Sarah",
        verificationToken: "raw-token",
      },
    ]);
  });

  it("stores outgoing password reset requests for tests without sending email", async () => {
    const service = new PlaceholderEmailService();

    await service.sendPasswordResetEmail({
      email: "sarah@example.com",
      firstName: "Sarah",
      resetToken: "raw-reset-token",
    });

    expect(service.getPasswordResetRequests()).toEqual([
      {
        email: "sarah@example.com",
        firstName: "Sarah",
        resetToken: "raw-reset-token",
      },
    ]);
  });

  it("stores outgoing invitation requests for tests without sending email", async () => {
    const service = new PlaceholderEmailService();

    await service.sendInvitationEmail({
      businessName: "Northstar Home Goods",
      email: "mia@northstar.example",
      fullName: "Mia Lewis",
      invitationLink: "/accept-invitation?token=raw-token",
    });

    expect(service.getInvitationRequests()).toEqual([
      {
        businessName: "Northstar Home Goods",
        email: "mia@northstar.example",
        fullName: "Mia Lewis",
        invitationLink: "/accept-invitation?token=raw-token",
      },
    ]);
  });
});

describe("ResendEmailService", () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalEmailFrom = process.env.SALENSE_EMAIL_FROM;
  const originalPublicAppUrl = process.env.PUBLIC_APP_URL;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.RESEND_API_KEY = originalApiKey;
    process.env.SALENSE_EMAIL_FROM = originalEmailFrom;
    process.env.PUBLIC_APP_URL = originalPublicAppUrl;
  });

  it("is enabled when a Resend API key is configured", () => {
    process.env.RESEND_API_KEY = "re_test";

    expect(isResendEmailConfigured()).toBe(true);
  });

  it("sends invitation emails with an absolute invitation link", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;
    process.env.RESEND_API_KEY = "re_test";
    process.env.SALENSE_EMAIL_FROM = "Salense <hello@getsalense.com>";
    process.env.PUBLIC_APP_URL = "http://localhost:3000";
    const service = new ResendEmailService();

    await service.sendInvitationEmail({
      businessName: "Northstar Home Goods",
      email: "mia@northstar.example",
      fullName: "Mia Lewis",
      invitationLink: "/accept-invitation?token=raw-token",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        body: expect.stringContaining(
          "http://localhost:3000/accept-invitation?token=raw-token",
        ),
        headers: expect.objectContaining({
          authorization: "Bearer re_test",
          "content-type": "application/json",
        }),
        method: "POST",
      }),
    );
  });
});
