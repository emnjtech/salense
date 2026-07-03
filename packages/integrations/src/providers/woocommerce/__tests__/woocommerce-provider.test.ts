import {
  IntegrationNotImplementedError,
  IntegrationPlatform,
  PlaceholderIntegrationProvider,
  SynchronisationResource,
  WooCommerceApiVersion,
  WooCommerceIntegrationProvider,
  validateWooCommerceConfiguration,
} from "../../../index.js";
import type { IntegrationProvider } from "../../integration-provider.js";

const provider = new WooCommerceIntegrationProvider();

const configuration = {
  platform: IntegrationPlatform.WooCommerce,
  businessId: "business_1",
  storeId: "store_1",
  storeName: "Main Woo Store",
  storeUrl: " https://shop.example.com ",
  consumerKeyMetadata: { configured: true, keyId: "ck_1" },
  consumerSecretMetadata: { configured: true, keyId: "cs_1" },
  apiVersion: WooCommerceApiVersion.WcV3,
};

const context = {
  platform: IntegrationPlatform.WooCommerce,
  businessId: "business_1",
  storeId: "store_1",
  triggeredAt: new Date("2026-07-03T10:00:00.000Z"),
};

describe("WooCommerceIntegrationProvider", () => {
  it("implements the shared integration provider contract", () => {
    const contractProvider: IntegrationProvider = provider;

    expect(contractProvider.platform).toBe(IntegrationPlatform.WooCommerce);
    expect(contractProvider).toBeInstanceOf(WooCommerceIntegrationProvider);
    expect(contractProvider).not.toBeInstanceOf(PlaceholderIntegrationProvider);
  });

  it("advertises the WooCommerce read-only commerce capabilities", () => {
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

  it("validates WooCommerce-specific configuration", () => {
    expect(validateWooCommerceConfiguration(configuration)).toEqual({
      ...configuration,
      storeUrl: "https://shop.example.com",
      platform: IntegrationPlatform.WooCommerce,
      apiVersion: WooCommerceApiVersion.WcV3,
    });
  });

  it("rejects missing store URL configuration", () => {
    expect(() =>
      validateWooCommerceConfiguration({
        platform: IntegrationPlatform.WooCommerce,
        businessId: "business_1",
      }),
    ).toThrow("WooCommerce store URL is required.");
  });

  it("keeps connection and auth methods as explicit placeholders", async () => {
    await expect(provider.connect(configuration)).rejects.toThrow(IntegrationNotImplementedError);
    await expect(provider.disconnect(configuration)).rejects.toThrow(IntegrationNotImplementedError);
    await expect(provider.validateConnection(configuration)).rejects.toThrow(
      IntegrationNotImplementedError,
    );
    await expect(provider.refreshAuthentication(configuration)).rejects.toThrow(
      IntegrationNotImplementedError,
    );
  });

  it("keeps all resource synchronisation methods as explicit placeholders", async () => {
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
});
