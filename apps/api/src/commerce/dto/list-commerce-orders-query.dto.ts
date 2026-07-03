import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";

export class ListCommerceOrdersQueryDto {
  @IsOptional()
  @IsEnum(StorePlatform)
  platform?: StorePlatform;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  status?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
