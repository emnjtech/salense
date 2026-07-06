import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AccountSettingsDetails } from "../account-settings-workspace";

describe("AccountSettingsDetails", () => {
  it("renders authenticated user and business profile data safely", () => {
    const html = renderToStaticMarkup(
      createElement(AccountSettingsDetails, {
        profile: {
          businessLogoUrl: null,
          businessName: "Northstar Home Goods",
          country: "GB",
          currency: "GBP",
          id: "business_1",
          industry: "Homeware and lifestyle retail",
          taxPreference: "VAT_REGISTERED",
          timeZone: "Europe/London",
        },
        user: {
          email: "maya@example.com",
          emailVerified: true,
          firstName: "Maya",
          id: "user_1",
          lastName: "Chen",
        },
      }),
    );

    expect(html).toContain("Maya");
    expect(html).toContain("Chen");
    expect(html).toContain("maya@example.com");
    expect(html).toContain("Northstar Home Goods");
    expect(html).toContain("GB");
    expect(html).toContain("GBP");
    expect(html).toContain("Europe/London");
    expect(html).toContain("Homeware and lifestyle retail");
    expect(html).not.toContain("passwordHash");
    expect(html).not.toContain("token");
  });
});
