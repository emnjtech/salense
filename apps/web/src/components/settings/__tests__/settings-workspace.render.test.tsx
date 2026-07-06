import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SettingsWorkspace } from "../settings-workspace";

describe("SettingsWorkspace", () => {
  it("renders workspace settings sections without leaving the authenticated product area", () => {
    const html = renderToStaticMarkup(createElement(SettingsWorkspace));

    expect(html).toContain("Settings");
    expect(html).toContain("Manage the Salense workspace");
    expect(html).toContain("Account");
    expect(html).toContain("Business profile");
    expect(html).toContain("Security");
    expect(html).toContain("Store connections");
    expect(html).toContain("Notifications");
    expect(html).toContain("Data &amp; privacy");
    expect(html).toContain("/settings/account");
    expect(html).toContain("/settings/security");
    expect(html).toContain("/store-integrations");
    expect(html).not.toContain("Demo");
    expect(html).not.toContain("MVP");
    expect(html).not.toContain("Endorsement");
  });
});
