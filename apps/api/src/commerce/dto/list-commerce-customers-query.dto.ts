import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";

export class ListCommerceCustomersQueryDto {
  @IsOptional()
  @IsEnum(StorePlatform)
  platform?: StorePlatform;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
