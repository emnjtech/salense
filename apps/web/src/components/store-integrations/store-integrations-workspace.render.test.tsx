import { renderToStaticMarkup } from "react-dom/server";
import { StoreIntegrationsWorkspace } from "./store-integrations-workspace";

describe("StoreIntegrationsWorkspace", () => {
  it("shows authorization-first connect cards with collapsed manual setup", () => {
    const html = renderToStaticMarkup(<StoreIntegrationsWorkspace />);

    expect(html).toContain("Connect Shopify");
    expect(html).toContain("Connect WooCommerce");
    expect(html).toContain("Advanced manual setup");
    expect(html).toContain("<details class=\"advanced-manual-setup\">");
    expect(html).not.toContain("<details open");
    expect(html).not.toMatch(/demo|mvp|endorsement|test workspace/i);
  });
});
