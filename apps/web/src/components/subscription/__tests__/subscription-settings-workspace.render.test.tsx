import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SubscriptionSettingsWorkspace } from "../subscription-settings-workspace";

describe("SubscriptionSettingsWorkspace", () => {
  it("renders authenticated plan and trial status without payment controls", () => {
    const html = renderToStaticMarkup(createElement(SubscriptionSettingsWorkspace));

    expect(html).toContain("Plan and trial");
    expect(html).toContain("Private Beta / Early Access");
    expect(html).toContain("free 30-day");
    expect(html).toContain("Connected stores usage");
    expect(html).toContain("Team members usage");
    expect(html).toContain("/request-invitation?plan=PROFESSIONAL");
    expect(html).not.toContain("Stripe");
    expect(html).not.toContain("invoice");
    expect(html).not.toContain("MVP");
    expect(html).not.toContain("Endorsement");
  });
});
