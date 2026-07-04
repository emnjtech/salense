import { IsNotEmpty, IsString } from "class-validator";

export class AmazonSellerConnectionCredentialsDto {
  @IsString()
  @IsNotEmpty()
  declare readonly accessToken: string;

  @IsString()
  @IsNotEmpty()
  declare readonly marketplaceId: string;

  @IsString()
  @IsNotEmpty()
  declare readonly refreshToken: string;

  @IsString()
  @IsNotEmpty()
  declare readonly sellerId: string;
}
