import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthenticatedNavigation } from "../authenticated-navigation";

jest.mock("next/navigation", () => ({
  usePathname: () => "/marketing-intelligence",
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const imageProps = { ...props };
    delete imageProps.priority;

    return createElement("img", imageProps);
  },
}));

jest.mock("../../../lib/auth-session", () => ({
  clearDemoSession: jest.fn(),
  readDemoSession: () => ({
    accessToken: "access-token",
    businessName: "Northstar Home Goods",
    refreshToken: "refresh-token",
    userEmail: "demo@salense.local",
  }),
}));

jest.mock("../../../lib/api/auth-client", () => ({
  createAuthApiClient: () => ({ logout: jest.fn() }),
}));

describe("AuthenticatedNavigation", () => {
  it("links to Marketing Intelligence in the customer workspace navigation", () => {
    const html = renderToStaticMarkup(createElement(AuthenticatedNavigation));

    expect(html).toContain('href="/marketing-intelligence"');
    expect(html).toContain("Marketing Intelligence");
    expect(html).toContain('aria-current="page"');
  });
});
