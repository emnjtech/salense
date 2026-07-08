import { Module } from "@nestjs/common";
import {
  EmailService,
  isResendEmailConfigured,
  PlaceholderEmailService,
  ResendEmailService,
} from "./email.service.js";

@Module({
  providers: [
    PlaceholderEmailService,
    ResendEmailService,
    {
      provide: EmailService,
      useFactory: (
        placeholderEmailService: PlaceholderEmailService,
        resendEmailService: ResendEmailService,
      ): EmailService =>
        isResendEmailConfigured() ? resendEmailService : placeholderEmailService,
      inject: [PlaceholderEmailService, ResendEmailService],
    },
  ],
  exports: [EmailService, PlaceholderEmailService, ResendEmailService],
})
export class EmailModule {}
