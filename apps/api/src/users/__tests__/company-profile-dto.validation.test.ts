import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CompanyProfileRequestDto } from "../dto/company-profile-request.dto.js";

async function validateCompanyProfile(payload: Record<string, unknown>) {
  return validate(plainToInstance(CompanyProfileRequestDto, payload));
}

describe("company profile DTO validation", () => {
  it("accepts the represented Chapter 6.1 company profile fields", async () => {
    const errors = await validateCompanyProfile({
      businessName: "Example Company",
      businessLogoUrl: "https://example.com/logo.png",
      country: "GB",
      timeZone: "Europe/London",
      currency: "GBP",
      taxPreference: "standard",
      industry: "E-commerce",
    });

    expect(errors).toHaveLength(0);
  });

  it("accepts an uploaded local logo data URL", async () => {
    const errors = await validateCompanyProfile({
      businessName: "Example Company",
      businessLogoUrl: "data:image/png;base64,ZmFrZS1sb2dv",
      country: "GB",
      timeZone: "Europe/London",
      currency: "GBP",
      taxPreference: "standard",
      industry: "E-commerce",
    });

    expect(errors).toHaveLength(0);
  });

  it("accepts null when the uploaded logo is removed", async () => {
    const errors = await validateCompanyProfile({
      businessName: "Example Company",
      businessLogoUrl: null,
      country: "GB",
      timeZone: "Europe/London",
      currency: "GBP",
      taxPreference: "standard",
      industry: "E-commerce",
    });

    expect(errors).toHaveLength(0);
  });

  it("rejects unsupported logo references with friendly copy", async () => {
    const errors = await validateCompanyProfile({
      businessName: "Example Company",
      businessLogoUrl: "not-a-logo",
      country: "GB",
      timeZone: "Europe/London",
      currency: "GBP",
      taxPreference: "standard",
      industry: "E-commerce",
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]?.constraints).toMatchObject({
      matches: "Business logo must be an uploaded PNG, JPG, SVG, or WebP image up to 2MB.",
    });
  });

  it("requires business identity and locale fields", async () => {
    const errors = await validateCompanyProfile({
      businessName: "",
      country: "GBR",
      currency: "POUND",
      timeZone: "",
      taxPreference: "",
      industry: "",
    });

    const invalidProperties = errors.map((error) => error.property);
    expect(invalidProperties).toEqual(
      expect.arrayContaining([
        "businessName",
        "country",
        "currency",
        "timeZone",
        "taxPreference",
        "industry",
      ]),
    );
  });
});
