import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PricingPage } from "../pricing-page";

describe("PricingPage", () => {
  it("renders the early-access pricing plans and invitation actions", () => {
    const html = renderToStaticMarkup(createElement(PricingPage));

    expect(html).toContain("Private Beta / Early Access");
    expect(html).toContain("Starter");
    expect(html).toContain("Professional");
    expect(html).toContain("Business");
    expect(html).toContain("£49");
    expect(html).toContain("£129");
    expect(html).toContain("£249");
    expect(html).toContain("/request-invitation?plan=STARTER");
    expect(html).toContain("/request-invitation?plan=PROFESSIONAL");
    expect(html).toContain("/request-invitation?plan=BUSINESS");
    expect(html).not.toContain("MVP");
    expect(html).not.toContain("Endorsement");
    expect(html).not.toContain("Test workspace");
  });
});
