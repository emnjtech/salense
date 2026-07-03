import {
  ConnectionHealthStatus,
  IntegrationNotImplementedError,
  PlaceholderIntegrationProvider,
  SynchronisationResource,
  IntegrationPlatform,
} from "../index.js";

const provider = new PlaceholderIntegrationProvider(IntegrationPlatform.WooCommerce);

const configuration = {
  platform: IntegrationPlatform.WooCommerce,
  businessId: "business_1",
  storeId: "store_1",
  storeName: "Main Store",
  storeUrl: "https://shop.example.com",
};

const context = {
  platform: IntegrationPlatform.WooCommerce,
  businessId: "business_1",
  storeId: "store_1",
  triggeredAt: new Date("2026-07-03T10:00:00.000Z"),
};

describe("PlaceholderIntegrationProvider", () => {
  it("exposes read-only commerce capabilities", () => {
    expect(provider.capabilities).toEqual({
      supportsOfficialAuthentication: true,
      supportsOrders: true,
      supportsProducts: true,
      supportsCustomers: true,
      supportsInventory: true,
      supportsCategories: true,
      supportsRefunds: true,
      supportsManualSynchronisation: true,
      supportsScheduledSynchronisation: true,
      readOnly: true,
    });
  });

  it("does not fake connection lifecycle success", async () => {
    await expect(provider.connect(configuration)).rejects.toThrow(IntegrationNotImplementedError);
    await expect(provider.disconnect(configuration)).rejects.toThrow(IntegrationNotImplementedError);
    await expect(provider.validateConnection(configuration)).rejects.toThrow(
      IntegrationNotImplementedError,
    );
    await expect(provider.refreshAuthentication(configuration)).rejects.toThrow(
      IntegrationNotImplementedError,
    );
  });

  it("does not fake synchronisation success", async () => {
    await expect(provider.synchroniseOrders(context)).rejects.toMatchObject({
      metadata: expect.objectContaining({ resource: SynchronisationResource.Orders }),
    });
    await expect(provider.synchroniseProducts(context)).rejects.toMatchObject({
      metadata: expect.objectContaining({ resource: SynchronisationResource.Products }),
    });
    await expect(provider.synchroniseCustomers(context)).rejects.toThrow(
      IntegrationNotImplementedError,
    );
    await expect(provider.synchroniseInventory(context)).rejects.toThrow(
      IntegrationNotImplementedError,
    );
    await expect(provider.synchroniseCategories(context)).rejects.toThrow(
      IntegrationNotImplementedError,
    );
    await expect(provider.synchroniseRefunds(context)).rejects.toThrow(
      IntegrationNotImplementedError,
    );
  });

  it("exports connection health states for future providers", () => {
    expect(ConnectionHealthStatus.AuthenticationExpired).toBe("AUTHENTICATION_EXPIRED");
  });
});
