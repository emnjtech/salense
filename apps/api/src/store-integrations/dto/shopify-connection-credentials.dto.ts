import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class ShopifyConnectionCredentialsDto {
  @IsString()
  @IsNotEmpty()
  declare readonly accessToken: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  declare readonly apiVersion?: string;

  @IsString()
  @IsNotEmpty()
  declare readonly shopDomain: string;
}
