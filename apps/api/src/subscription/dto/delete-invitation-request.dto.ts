import { IsString } from "class-validator";

export class DeleteInvitationRequestDto {
  @IsString()
  readonly confirmation!: string;
}
