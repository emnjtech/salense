import { IsNotEmpty, IsString } from "class-validator";

export class RefreshSessionRequestDto {
  @IsString()
  @IsNotEmpty()
  declare readonly refreshToken: string;
}
