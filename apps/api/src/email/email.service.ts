import { Injectable, InternalServerErrorException } from "@nestjs/common";

export interface VerificationEmailRequest {
  readonly email: string;
  readonly firstName: string;
  readonly verificationToken: string;
}

export interface PasswordResetEmailRequest {
  readonly email: string;
  readonly firstName: string;
  readonly resetToken: string;
}

export interface InvitationEmailRequest {
  readonly businessName: string;
  readonly email: string;
  readonly fullName: string;
  readonly invitationLink: string;
}

export abstract class EmailService {
  abstract sendVerificationEmail(request: VerificationEmailRequest): Promise<void>;
  abstract sendPasswordResetEmail(request: PasswordResetEmailRequest): Promise<void>;
  abstract sendInvitationEmail(request: InvitationEmailRequest): Promise<void>;
}

@Injectable()
export class PlaceholderEmailService implements EmailService {
  private readonly verificationRequests: VerificationEmailRequest[] = [];
  private readonly passwordResetRequests: PasswordResetEmailRequest[] = [];
  private readonly invitationRequests: InvitationEmailRequest[] = [];

  async sendVerificationEmail(request: VerificationEmailRequest): Promise<void> {
    this.verificationRequests.push(request);
  }

  async sendPasswordResetEmail(request: PasswordResetEmailRequest): Promise<void> {
    this.passwordResetRequests.push(request);
  }

  async sendInvitationEmail(request: InvitationEmailRequest): Promise<void> {
    this.invitationRequests.push(request);
  }

  getVerificationRequests(): readonly VerificationEmailRequest[] {
    return this.verificationRequests;
  }

  getPasswordResetRequests(): readonly PasswordResetEmailRequest[] {
    return this.passwordResetRequests;
  }

  getInvitationRequests(): readonly InvitationEmailRequest[] {
    return this.invitationRequests;
  }

  clearVerificationRequests(): void {
    this.verificationRequests.length = 0;
  }

  clearPasswordResetRequests(): void {
    this.passwordResetRequests.length = 0;
  }

  clearInvitationRequests(): void {
    this.invitationRequests.length = 0;
  }
}

@Injectable()
export class ResendEmailService implements EmailService {
  private readonly apiKey: string;
  private readonly from: string;
  private readonly publicAppUrl: string;

  constructor() {
    const config = readResendEmailConfig({ requireConfigured: false });

    this.apiKey = config.apiKey;
    this.from = config.from;
    this.publicAppUrl = trimTrailingSlash(config.publicAppUrl);
  }

  async sendVerificationEmail(request: VerificationEmailRequest): Promise<void> {
    const verificationLink = this.toAbsoluteUrl(
      `/verify-email?token=${encodeURIComponent(request.verificationToken)}`,
    );

    await this.sendEmail({
      html: renderActionEmail({
        actionLabel: "Verify email",
        actionUrl: verificationLink,
        body: [
          `Hi ${request.firstName},`,
          "Please verify your email address to continue setting up your Salense workspace.",
        ],
        title: "Verify your Salense email address",
      }),
      subject: "Verify your Salense email address",
      to: request.email,
    });
  }

  async sendPasswordResetEmail(request: PasswordResetEmailRequest): Promise<void> {
    const resetLink = this.toAbsoluteUrl(
      `/reset-password?token=${encodeURIComponent(request.resetToken)}`,
    );

    await this.sendEmail({
      html: renderActionEmail({
        actionLabel: "Reset password",
        actionUrl: resetLink,
        body: [
          `Hi ${request.firstName},`,
          "Use this secure link to reset your Salense password. If you did not request this, you can ignore this email.",
        ],
        title: "Reset your Salense password",
      }),
      subject: "Reset your Salense password",
      to: request.email,
    });
  }

  async sendInvitationEmail(request: InvitationEmailRequest): Promise<void> {
    const invitationLink = this.toAbsoluteUrl(request.invitationLink);

    await this.sendEmail({
      html: renderActionEmail({
        actionLabel: "Accept invitation",
        actionUrl: invitationLink,
        body: [
          `Hi ${request.fullName},`,
          `${request.businessName} has been approved for private access to Salense.`,
          "Accept your invitation to create your account and start setting up your commerce intelligence workspace.",
        ],
        title: "Your Salense invitation is ready",
      }),
      subject: "Your Salense invitation is ready",
      to: request.email,
    });
  }

  private toAbsoluteUrl(pathOrUrl: string): string {
    if (/^https?:\/\//u.test(pathOrUrl)) {
      return pathOrUrl;
    }

    return `${this.publicAppUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
  }

  private async sendEmail(input: ResendEmailInput): Promise<void> {
    if (!this.apiKey || !this.from || !this.publicAppUrl) {
      throw new InternalServerErrorException(
        "Resend email delivery requires RESEND_API_KEY, SALENSE_EMAIL_FROM, and PUBLIC_APP_URL.",
      );
    }

    const response = await fetch("https://api.resend.com/emails", {
      body: JSON.stringify({
        from: this.from,
        html: input.html,
        subject: input.subject,
        to: [input.to],
      }),
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new InternalServerErrorException(
        "Invitation email could not be sent. Please check the email provider configuration.",
      );
    }
  }
}

interface ResendEmailServiceConfig {
  readonly apiKey: string;
  readonly from: string;
  readonly publicAppUrl: string;
}

interface ResendEmailInput {
  readonly html: string;
  readonly subject: string;
  readonly to: string;
}

interface ActionEmailInput {
  readonly actionLabel: string;
  readonly actionUrl: string;
  readonly body: readonly string[];
  readonly title: string;
}

export function isResendEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function readResendEmailConfig(options: { readonly requireConfigured: boolean }): ResendEmailServiceConfig {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.SALENSE_EMAIL_FROM?.trim();
  const publicAppUrl = process.env.PUBLIC_APP_URL?.trim();

  if (options.requireConfigured && (!apiKey || !from || !publicAppUrl)) {
    throw new InternalServerErrorException(
      "Resend email delivery requires RESEND_API_KEY, SALENSE_EMAIL_FROM, and PUBLIC_APP_URL.",
    );
  }

  return { apiKey: apiKey ?? "", from: from ?? "", publicAppUrl: publicAppUrl ?? "" };
}

function renderActionEmail(input: ActionEmailInput): string {
  const body = input.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
  const actionUrl = escapeHtml(input.actionUrl);
  const actionLabel = escapeHtml(input.actionLabel);

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;color:#10231c;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <div style="background:#ffffff;border:1px solid #dfe8e2;border-radius:14px;padding:28px;">
        <p style="margin:0 0 18px;color:#0e6b47;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Salense</p>
        <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;color:#10231c;">${escapeHtml(input.title)}</h1>
        <div style="font-size:15px;line-height:1.65;color:#3b4f45;">${body}</div>
        <p style="margin:24px 0;">
          <a href="${actionUrl}" style="display:inline-block;background:#10794f;color:#ffffff;text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:700;">${actionLabel}</a>
        </p>
        <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#607268;">If the button does not work, copy and paste this link into your browser:<br><a href="${actionUrl}" style="color:#10794f;">${actionUrl}</a></p>
      </div>
    </div>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, "");
}
