import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginRequestDto {
  @IsEmail()
  declare readonly email: string;

  @IsString()
  @IsNotEmpty()
  declare readonly password: string;
}
