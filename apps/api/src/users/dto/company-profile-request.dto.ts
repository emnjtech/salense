export class CompanyProfileRequestDto {
  declare readonly businessName: string;
  declare readonly businessLogoUrl?: string;
  declare readonly country: string;
  declare readonly timeZone: string;
  declare readonly currency: string;
  declare readonly taxPreference: string;
  declare readonly industry: string;
}
