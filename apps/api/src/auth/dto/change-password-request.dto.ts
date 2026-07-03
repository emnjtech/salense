import { IsNotEmpty, IsString, Matches, MinLength } from "class-validator";

export class ChangePasswordRequestDto {
  @IsString()
  @IsNotEmpty()
  declare readonly currentPassword: string;

  @IsString()
  @MinLength(12)
  @Matches(/[A-Z]/, { message: "newPassword must include an uppercase letter" })
  @Matches(/[a-z]/, { message: "newPassword must include a lowercase letter" })
  @Matches(/[0-9]/, { message: "newPassword must include a number" })
  @Matches(/[^A-Za-z0-9]/, { message: "newPassword must include a special character" })
  declare readonly newPassword: string;

  @IsString()
  @IsNotEmpty()
  declare readonly confirmNewPassword: string;
}
