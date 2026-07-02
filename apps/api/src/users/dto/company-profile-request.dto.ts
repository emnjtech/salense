import { IsNotEmpty, IsOptional, IsString, IsUrl, Length } from "class-validator";

export class CompanyProfileRequestDto {
  @IsString()
  @IsNotEmpty()
  declare readonly businessName: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  declare readonly businessLogoUrl?: string;

  @IsString()
  @Length(2, 2)
  declare readonly country: string;

  @IsString()
  @IsNotEmpty()
  declare readonly timeZone: string;

  @IsString()
  @Length(3, 3)
  declare readonly currency: string;

  @IsString()
  @IsNotEmpty()
  declare readonly taxPreference: string;

  @IsString()
  @IsNotEmpty()
  declare readonly industry: string;
}
