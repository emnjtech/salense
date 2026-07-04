import { Type } from "class-transformer";
import {
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { StorePlatform } from "../types/store-platform.enum.js";
import { AmazonSellerConnectionCredentialsDto } from "./amazon-seller-connection-credentials.dto.js";
import { TikTokShopConnectionCredentialsDto } from "./tiktok-shop-connection-credentials.dto.js";
import { WooCommerceConnectionCredentialsDto } from "./woocommerce-connection-credentials.dto.js";

export class PrepareStoreConnectionRequestDto {
  @IsEnum(StorePlatform)
  declare readonly platform: StorePlatform;

  @IsString()
  @IsNotEmpty()
  declare readonly storeName: string;

  @ValidateIf(
    (request: PrepareStoreConnectionRequestDto) =>
      request.platform === StorePlatform.WooCommerce || request.storeUrl !== undefined,
  )
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  declare readonly storeUrl?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  declare readonly region?: string;

  @ValidateIf(
    (request: PrepareStoreConnectionRequestDto) =>
      request.platform === StorePlatform.WooCommerce || request.wooCommerceCredentials !== undefined,
  )
  @IsDefined()
  @ValidateNested()
  @Type(() => WooCommerceConnectionCredentialsDto)
  declare readonly wooCommerceCredentials?: WooCommerceConnectionCredentialsDto;

  @ValidateIf(
    (request: PrepareStoreConnectionRequestDto) =>
      request.platform === StorePlatform.AmazonSeller || request.amazonSellerCredentials !== undefined,
  )
  @IsDefined()
  @ValidateNested()
  @Type(() => AmazonSellerConnectionCredentialsDto)
  declare readonly amazonSellerCredentials?: AmazonSellerConnectionCredentialsDto;

  @ValidateIf(
    (request: PrepareStoreConnectionRequestDto) =>
      request.platform === StorePlatform.TikTokShop || request.tikTokShopCredentials !== undefined,
  )
  @IsDefined()
  @ValidateNested()
  @Type(() => TikTokShopConnectionCredentialsDto)
  declare readonly tikTokShopCredentials?: TikTokShopConnectionCredentialsDto;
}
