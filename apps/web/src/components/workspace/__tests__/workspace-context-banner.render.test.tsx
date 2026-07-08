import { renderToStaticMarkup } from "react-dom/server";
import { WorkspaceContextBanner } from "../workspace-context-banner";

describe("WorkspaceContextBanner", () => {
  it("uses production workspace language", () => {
    const html = renderToStaticMarkup(<WorkspaceContextBanner />);

    expect(html).toContain("Your business");
    expect(html).toContain("Commerce intelligence");
    expect(html).not.toMatch(/demo|mvp|endorsement|seeded|test workspace/i);
  });
});
