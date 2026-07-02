import { Module } from "@nestjs/common";
import { EmailService, PlaceholderEmailService } from "./email.service.js";

@Module({
  providers: [
    PlaceholderEmailService,
    {
      provide: EmailService,
      useExisting: PlaceholderEmailService,
    },
  ],
  exports: [EmailService, PlaceholderEmailService],
})
export class EmailModule {}
