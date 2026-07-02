import { IsNotEmpty, IsString } from "class-validator";

export class EmailVerificationRequestDto {
  @IsString()
  @IsNotEmpty()
  declare readonly token: string;
}
