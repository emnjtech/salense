import { renderToStaticMarkup } from "react-dom/server";
import { WorkspaceContextBanner } from "../workspace-context-banner";

describe("WorkspaceContextBanner", () => {
  it("uses production workspace language", () => {
    const html = renderToStaticMarkup(<WorkspaceContextBanner />);

    expect(html).toContain("Northstar Home Goods");
    expect(html).toContain("commerce intelligence");
    expect(html).not.toMatch(/demo|mvp|endorsement|seeded|test workspace/i);
  });
});
