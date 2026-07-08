import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class ShopifyOAuthStartQueryDto {
  @IsString()
  @IsNotEmpty()
  declare readonly shop: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  declare readonly storeName?: string;
}

export class MarketplaceOAuthStartQueryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  declare readonly region?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  declare readonly storeName?: string;
}

export class StoreOAuthCallbackQueryDto {
  @IsString()
  @IsNotEmpty()
  declare readonly state: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  declare readonly code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  declare readonly error?: string;
}
