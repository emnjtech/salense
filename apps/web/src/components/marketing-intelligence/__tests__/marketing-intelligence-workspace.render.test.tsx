import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarketingIntelligenceWorkspace } from "../marketing-intelligence-workspace";

describe("MarketingIntelligenceWorkspace", () => {
  it("renders a coming soon marketing intelligence workspace without live metrics", () => {
    const html = renderToStaticMarkup(createElement(MarketingIntelligenceWorkspace));

    expect(html).toContain("Marketing Intelligence");
    expect(html).toContain("Coming Soon");
    expect(html).toContain("AI Marketing Briefing");
    expect(html).toContain("Available after connecting your social media accounts.");
    expect(html).toContain("Instagram");
    expect(html).toContain("Facebook");
    expect(html).toContain("TikTok");
    expect(html).toContain("YouTube");
    expect(html).toContain("LinkedIn");
    expect(html).toContain("Pinterest");
    expect(html).toContain("Connect — Coming Soon");
    expect(html).not.toContain("client secret");
    expect(html).not.toContain("API key");
  });
});
