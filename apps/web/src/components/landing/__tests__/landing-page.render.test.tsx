import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HowItWorksPage } from "../how-it-works-page";
import { LandingPage } from "../landing-page";

describe("LandingPage", () => {
  it("renders the public landing flow with screenshot and working navigation", () => {
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html).toContain("Commerce intelligence that");
    expect(html).toContain("landingPage%2Fhero.png");
    expect(html).toContain("href=\"/pricing\"");
    expect(html).toContain("href=\"/how-it-works\"");
    expect(html).toContain("href=\"/login\"");
    expect(html).toContain("See how it works");
    expect(html).toContain("Get started");
  });
});

describe("HowItWorksPage", () => {
  it("renders a local video walkthrough page with pricing and login links", () => {
    const html = renderToStaticMarkup(createElement(HowItWorksPage));

    expect(html).toContain("See how Salense works");
    expect(html).toContain("/how-salense-works.mp4");
    expect(html).toContain("controls");
    expect(html).toContain("href=\"/pricing\"");
    expect(html).toContain("href=\"/login\"");
  });
});
