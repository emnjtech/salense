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
