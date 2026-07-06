import { Injectable } from "@nestjs/common";

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
