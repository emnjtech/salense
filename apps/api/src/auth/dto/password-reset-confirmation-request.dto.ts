import { IsNotEmpty, IsString, Matches, MinLength } from "class-validator";

export class PasswordResetConfirmationRequestDto {
  @IsString()
  @IsNotEmpty()
  declare readonly token: string;

  @IsString()
  @MinLength(12)
  @Matches(/[A-Z]/, { message: "password must include an uppercase letter" })
  @Matches(/[a-z]/, { message: "password must include a lowercase letter" })
  @Matches(/[0-9]/, { message: "password must include a number" })
  @Matches(/[^A-Za-z0-9]/, { message: "password must include a special character" })
  declare readonly password: string;

  @IsString()
  @IsNotEmpty()
  declare readonly confirmPassword: string;
}
