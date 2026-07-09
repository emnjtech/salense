import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AdsPromotionsWorkspace } from "../ads-promotions-workspace";

describe("AdsPromotionsWorkspace", () => {
  it("renders a read-only future module placeholder without credential setup", () => {
    const html = renderToStaticMarkup(createElement(AdsPromotionsWorkspace));

    expect(html).toContain("Ads &amp; Promotions");
    expect(html).toContain("Google Ads integration");
    expect(html).toContain("Meta Ads integration");
    expect(html).toContain("Coming soon");
    expect(html).not.toContain(">Future<");
    expect(html).toContain("Google Ads and Meta Ads credentials are not required");
    expect(html).not.toContain("client secret");
    expect(html).not.toContain("API key");
  });
});
