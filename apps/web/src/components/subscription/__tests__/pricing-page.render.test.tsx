import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PricingPage } from "../pricing-page";

describe("PricingPage", () => {
  it("renders the early-access pricing plans and invitation actions", () => {
    const html = renderToStaticMarkup(createElement(PricingPage));

    expect(html).toContain("Private Beta / Early Access");
    expect(html).toContain("Starter");
    expect(html).toContain("Business");
    expect(html).toContain("Enterprise");
    expect(html).toContain("\u00a320");
    expect(html).toContain("\u00a335");
    expect(html).toContain("\u00a370");
    expect(html).toContain("Ideal for small businesses beginning multi-channel selling.");
    expect(html).toContain("Designed for growing businesses managing multiple sales channels.");
    expect(html).toContain(
      "For established businesses requiring advanced commerce intelligence across larger operations.",
    );
    expect(html).toContain("/request-invitation?plan=STARTER");
    expect(html).toContain("/request-invitation?plan=PROFESSIONAL");
    expect(html).toContain("/request-invitation?plan=BUSINESS");
    expect(html).not.toContain("Professional");
    expect(html).not.toContain("MVP");
    expect(html).not.toContain("Endorsement");
    expect(html).not.toContain("Test workspace");
  });
});
