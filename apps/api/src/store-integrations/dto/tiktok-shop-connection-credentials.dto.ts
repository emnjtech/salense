import { IsNotEmpty, IsString } from "class-validator";

export class TikTokShopConnectionCredentialsDto {
  @IsString()
  @IsNotEmpty()
  declare readonly accessToken: string;

  @IsString()
  @IsNotEmpty()
  declare readonly refreshToken: string;

  @IsString()
  @IsNotEmpty()
  declare readonly shopCipher: string;

  @IsString()
  @IsNotEmpty()
  declare readonly shopId: string;
}
