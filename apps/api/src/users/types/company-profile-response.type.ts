export interface CompanyProfileResponse {
  readonly id: string;
  readonly businessName: string;
  readonly businessLogoUrl: string | null;
  readonly country: string;
  readonly timeZone: string;
  readonly currency: string;
  readonly taxPreference: string;
  readonly industry: string;
}
