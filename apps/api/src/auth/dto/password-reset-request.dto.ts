import { IsEmail } from "class-validator";

export class PasswordResetRequestDto {
  @IsEmail()
  declare readonly email: string;
}
