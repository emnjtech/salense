import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";

export class ReportsOverviewQueryDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsEnum(StorePlatform)
  platform?: StorePlatform;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  store?: string;
}
