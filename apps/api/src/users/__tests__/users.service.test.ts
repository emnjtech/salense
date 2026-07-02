import { NotImplementedException } from "@nestjs/common";
import { UsersService } from "../users.service.js";

describe("UsersService", () => {
  it("keeps company profile persistence unimplemented in the skeleton", () => {
    const service = new UsersService();

    expect(() =>
      service.updateCompanyProfile({
        businessName: "Example Company",
        country: "GB",
        timeZone: "Europe/London",
        currency: "GBP",
        taxPreference: "standard",
        industry: "E-commerce",
      }),
    ).toThrow(NotImplementedException);
  });
});
