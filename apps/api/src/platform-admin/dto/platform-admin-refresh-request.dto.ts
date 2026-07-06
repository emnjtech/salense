import { IsString, MinLength } from "class-validator";

export class PlatformAdminRefreshRequestDto {
  @IsString()
  @MinLength(1)
  readonly refreshToken!: string;
}
