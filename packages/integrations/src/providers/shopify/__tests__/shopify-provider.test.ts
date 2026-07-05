import {
  ConnectionHealthStatus,
  IntegrationAuthenticationError,
  IntegrationNotImplementedError,
  IntegrationPlatform,
  PlaceholderIntegrationProvider,
  SynchronisationResource,
  ShopifyIntegrationProvider,
  validateShopifyConfiguration,
} from "../../../index.js";
import type { IntegrationProvider } from "../../integration-provider.js";

const provider = new ShopifyIntegrationProvider();

const configuration = {
  accessTokenHash: "shpat_test_access_token",
  accessTokenMetadata: { configured: true, keyId: "access_1" },
  apiVersion: "2024-10",
  businessId: "business_1",
  consumerKey: "northstar-home.myshopify.com",
  consumerKeyMetadata: { configured: true, keyId: "shop_1" },
  platform: IntegrationPlatform.Shopify,
  refreshTokenHash: "",
  refreshTokenMetadata: { configured: false },
  storeId: "store_shopify_1",
  storeName: "Shopify UK",
  storeUrl: "https://northstar-home.myshopify.com",
};

const context = {
  businessId: "business_1",
  platform: IntegrationPlatform.Shopify,
  storeId: "store_shopify_1",
  triggeredAt: new Date("2026-07-03T10:00:00.000Z"),
};

describe("ShopifyIntegrationProvider", () => {
  it("implements the shared integration provider contract", () => {
    const contractProvider: IntegrationProvider = provider;

    expect(contractProvider.platform).toBe(IntegrationPlatform.Shopify);
    expect(contractProvider).toBeInstanceOf(ShopifyIntegrationProvider);
    expect(contractProvider).not.toBeInstanceOf(PlaceholderIntegrationProvider);
  });

  it("advertises read-only commerce capabilities", () => {
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

  it("validates Shopify-specific configuration", () => {
    expect(validateShopifyConfiguration(configuration)).toEqual({
      accessToken: "shpat_test_access_token",
      apiVersion: "2024-10",
      shopDomain: "northstar-home.myshopify.com",
    });
  });

  it("normalises bare Shopify shop names", () => {
    const { storeUrl, ...configurationWithoutStoreUrl } = configuration;

    expect(
      validateShopifyConfiguration({
        ...configurationWithoutStoreUrl,
        consumerKey: "northstar-home",
      }),
    ).toMatchObject({ shopDomain: "northstar-home.myshopify.com" });
    expect(storeUrl).toBe("https://northstar-home.myshopify.com");
  });

  it("validates credentials through the read-only REST client", async () => {
    const restClient = {
      validateConnection: jest.fn().mockResolvedValue({
        checkedAt: new Date("2026-07-03T11:00:00.000Z"),
        status: ConnectionHealthStatus.Healthy,
      }),
    };
    const validatingProvider = new ShopifyIntegrationProvider(restClient);

    await expect(validatingProvider.validateConnection(configuration)).resolves.toMatchObject({
      status: ConnectionHealthStatus.Healthy,
    });
    expect(restClient.validateConnection).toHaveBeenCalledWith({
      accessToken: "shpat_test_access_token",
      apiVersion: "2024-10",
      shopDomain: "northstar-home.myshopify.com",
    });
  });

  it("rejects validation when transient access token is missing", async () => {
    const { accessTokenHash, ...configurationWithoutAccessToken } = configuration;

    await expect(provider.validateConnection(configurationWithoutAccessToken)).rejects.toThrow(
      IntegrationAuthenticationError,
    );
    expect(accessTokenHash).toBe("shpat_test_access_token");
  });

  it("keeps provider orchestration methods delegated to Salense services", async () => {
    await expect(provider.connect(configuration)).rejects.toThrow(IntegrationNotImplementedError);
    await expect(provider.disconnect(configuration)).rejects.toThrow(IntegrationNotImplementedError);
    await expect(provider.refreshAuthentication(configuration)).rejects.toThrow(
      IntegrationNotImplementedError,
    );
    await expect(provider.synchroniseOrders(context)).rejects.toMatchObject({
      metadata: expect.objectContaining({ resource: SynchronisationResource.Orders }),
    });
  });
});
