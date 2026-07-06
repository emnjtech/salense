import { IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength } from "class-validator";

const companyLogoReferencePattern =
  /^(https?:\/\/.+|data:image\/(?:png|jpeg|jpg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+)$/u;

export class CompanyProfileRequestDto {
  @IsString()
  @IsNotEmpty()
  declare readonly businessName: string;

  @IsOptional()
  @IsString()
  @MaxLength(3_000_000)
  @Matches(companyLogoReferencePattern, {
    message: "Business logo must be an uploaded PNG, JPG, SVG, or WebP image up to 2MB.",
  })
  declare readonly businessLogoUrl?: string | null;

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
