import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AboutPage } from "../about-page";
import { HowItWorksPage } from "../how-it-works-page";
import { IntegrationsPage } from "../integrations-page";
import { LandingPage } from "../landing-page";

describe("LandingPage", () => {
  it("renders the public landing flow with screenshot and working navigation", () => {
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html).toContain("Commerce intelligence that");
    expect(html).toContain("landingPage%2Fhero.png");
    expect(html).toContain("href=\"/integrations\"");
    expect(html).toContain("href=\"/pricing\"");
    expect(html).toContain("href=\"/about\"");
    expect(html).toContain("href=\"/how-it-works\"");
    expect(html).toContain("href=\"/login\"");
    expect(html).toContain("See how it works");
    expect(html).toContain("Get started");
    expect(html).not.toContain(">Product<");
    expect(html).not.toContain(">Resources<");
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

describe("AboutPage", () => {
  it("renders Salense positioning and public navigation", () => {
    const html = renderToStaticMarkup(createElement(AboutPage));

    expect(html).toContain("About Salense");
    expect(html).toContain("What Salense is");
    expect(html).toContain("Why Salense exists");
    expect(html).toContain("Read-only commerce intelligence");
    expect(html).toContain("Built for growing teams");
    expect(html).toContain("Source integrity, explainable intelligence and business clarity");
    expect(html).toContain("href=\"/integrations\"");
    expect(html).toContain("href=\"/pricing\"");
    expect(html).toContain("href=\"/login\"");
  });
});

describe("IntegrationsPage", () => {
  it("renders supported and planned integrations", () => {
    const html = renderToStaticMarkup(createElement(IntegrationsPage));

    expect(html).toContain("Shopify");
    expect(html).toContain("WooCommerce");
    expect(html).toContain("Amazon Seller");
    expect(html).toContain("TikTok Shop");
    expect(html).toContain("Read-only sync");
    expect(html).toContain("Orders");
    expect(html).toContain("Products");
    expect(html).toContain("Customers");
    expect(html).toContain("Inventory");
    expect(html).toContain("Reports");
    expect(html).toContain("Etsy");
    expect(html).toContain("BigCommerce");
    expect(html).toContain("not currently active");
  });
});
