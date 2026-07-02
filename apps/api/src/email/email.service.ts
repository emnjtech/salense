import { Injectable } from "@nestjs/common";

export interface VerificationEmailRequest {
  readonly email: string;
  readonly firstName: string;
  readonly verificationToken: string;
}

export abstract class EmailService {
  abstract sendVerificationEmail(request: VerificationEmailRequest): Promise<void>;
}

@Injectable()
export class PlaceholderEmailService implements EmailService {
  private readonly verificationRequests: VerificationEmailRequest[] = [];

  async sendVerificationEmail(request: VerificationEmailRequest): Promise<void> {
    this.verificationRequests.push(request);
  }

  getVerificationRequests(): readonly VerificationEmailRequest[] {
    return this.verificationRequests;
  }

  clearVerificationRequests(): void {
    this.verificationRequests.length = 0;
  }
}
