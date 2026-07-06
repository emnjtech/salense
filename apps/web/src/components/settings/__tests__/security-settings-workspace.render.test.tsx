import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SecuritySettingsWorkspace } from "../security-settings-workspace";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe("SecuritySettingsWorkspace", () => {
  it("renders the authenticated security settings page shell", () => {
    const html = renderToStaticMarkup(createElement(SecuritySettingsWorkspace));

    expect(html).toContain("Security");
    expect(html).toContain("Manage sign-in protection");
    expect(html).toContain("Loading security settings");
    expect(html).not.toContain("Demo");
    expect(html).not.toContain("MVP");
    expect(html).not.toContain("Endorsement");
  });
});
