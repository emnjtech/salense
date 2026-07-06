import { IsNotEmpty, IsString } from "class-validator";

export class InvitationTokenQueryDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
