import { renderToStaticMarkup } from "react-dom/server";
import {
  StoreIntegrationsWorkspace,
  canInitiateStoreConnection,
  getConnectionButtonClassName,
  getConnectionButtonLabel,
  toPlatformConnectionState,
} from "../store-integrations-workspace";
import {
  StoreConnectionStatus,
  StorePlatform,
  type ConnectedStore,
} from "../../../lib/api/store-integrations-client";

describe("StoreIntegrationsWorkspace", () => {
  it("shows authorization-first connect cards with collapsed manual setup", () => {
    const html = renderToStaticMarkup(<StoreIntegrationsWorkspace />);

    expect(html).toContain("Connect Shopify");
    expect(html).toContain("Connect WooCommerce");
    expect(html).toContain("Advanced manual setup");
    expect(html).toContain('<details class="advanced-manual-setup">');
    expect(html).not.toContain("<details open");
    expect(html).not.toMatch(/demo|mvp|endorsement|test workspace/i);
  });

  it("disables duplicate connection attempts for connected stores", () => {
    const store = storeConnection(StorePlatform.WooCommerce, StoreConnectionStatus.Connected);

    expect(canInitiateStoreConnection(store)).toBe(false);
    expect(getConnectionButtonLabel("WooCommerce", store)).toBe("Connected");
    expect(getConnectionButtonClassName(store)).toContain("connected");
  });

  it("restores connect behavior when no active store is present", () => {
    expect(canInitiateStoreConnection(null)).toBe(true);
    expect(getConnectionButtonLabel("WooCommerce", null)).toBe("Connect WooCommerce");
  });

  it("shows reconnect for expired authentication", () => {
    const store = storeConnection(
      StorePlatform.Shopify,
      StoreConnectionStatus.AuthenticationExpired,
    );

    expect(canInitiateStoreConnection(store)).toBe(true);
    expect(getConnectionButtonLabel("Shopify", store)).toBe("Reconnect");
  });

  it("shows synchronising state and disables actions", () => {
    const store = storeConnection(StorePlatform.AmazonSeller, StoreConnectionStatus.Synchronising);

    expect(canInitiateStoreConnection(store)).toBe(false);
    expect(getConnectionButtonLabel("Amazon Seller", store)).toBe("Synchronising...");
    expect(getConnectionButtonClassName(store)).toContain("synchronising");
  });

  it("maps the first active store per platform for connection state", () => {
    const wooCommerce = storeConnection(StorePlatform.WooCommerce, StoreConnectionStatus.Connected);
    const disconnectedShopify = storeConnection(
      StorePlatform.Shopify,
      StoreConnectionStatus.Disconnected,
    );

    expect(toPlatformConnectionState([wooCommerce, disconnectedShopify])).toEqual({
      [StorePlatform.WooCommerce]: wooCommerce,
    });
  });
});

function storeConnection(
  platform: StorePlatform,
  connectionStatus: StoreConnectionStatus,
): ConnectedStore {
  return {
    businessId: "business_1",
    connectionStatus,
    createdAt: "2026-07-03T11:00:00.000Z",
    id: `${platform.toLowerCase()}_store`,
    lastSynchronisedAt: null,
    platform,
    region: null,
    storeName: `${platform} Store`,
    storeUrl: "https://store.example.com",
    updatedAt: "2026-07-03T11:00:00.000Z",
  };
}
