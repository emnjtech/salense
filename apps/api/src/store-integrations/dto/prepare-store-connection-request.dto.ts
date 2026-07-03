import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from "class-validator";
import { StorePlatform } from "../types/store-platform.enum.js";

export class PrepareStoreConnectionRequestDto {
  @IsEnum(StorePlatform)
  declare readonly platform: StorePlatform;

  @IsString()
  @IsNotEmpty()
  declare readonly storeName: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  declare readonly storeUrl?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  declare readonly region?: string;
}
