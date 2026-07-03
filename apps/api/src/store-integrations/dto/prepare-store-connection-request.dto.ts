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
}
