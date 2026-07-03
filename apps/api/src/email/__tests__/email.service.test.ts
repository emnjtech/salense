import { PlaceholderEmailService } from "../email.service.js";

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
});
