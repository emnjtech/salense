import {
  ConnectionHealthStatus,
  IntegrationAuthenticationError,
  IntegrationNotImplementedError,
  IntegrationPlatform,
  PlaceholderIntegrationProvider,
  SynchronisationResource,
  TikTokShopApiRegion,
  TikTokShopIntegrationProvider,
  validateTikTokShopConfiguration,
} from "../../../index.js";
import type { IntegrationProvider } from "../../integration-provider.js";

const provider = new TikTokShopIntegrationProvider();

const configuration = {
  accessTokenHash: "access-token",
  accessTokenMetadata: { configured: true, keyId: "access_1" },
  apiVersion: "shop_cipher_123",
  businessId: "business_1",
  consumerKey: "shop_123",
  consumerKeyMetadata: { configured: true, keyId: "shop_1" },
  platform: IntegrationPlatform.TikTokShop,
  refreshTokenHash: "refresh-token",
  refreshTokenMetadata: { configured: true, keyId: "refresh_1" },
  region: "GB",
  storeId: "store_tiktok_1",
  storeName: "TikTok UK",
};

const context = {
  businessId: "business_1",
  platform: IntegrationPlatform.TikTokShop,
  storeId: "store_tiktok_1",
  triggeredAt: new Date("2026-07-03T10:00:00.000Z"),
};

describe("TikTokShopIntegrationProvider", () => {
  it("implements the shared integration provider contract", () => {
    const contractProvider: IntegrationProvider = provider;

    expect(contractProvider.platform).toBe(IntegrationPlatform.TikTokShop);
    expect(contractProvider).toBeInstanceOf(TikTokShopIntegrationProvider);
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

  it("validates TikTok Shop-specific configuration", () => {
    expect(validateTikTokShopConfiguration(configuration)).toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      region: TikTokShopApiRegion.Europe,
      shopCipher: "shop_cipher_123",
      shopId: "shop_123",
    });
  });

  it("validates credentials through the read-only REST client", async () => {
    const restClient = {
      validateConnection: jest.fn().mockResolvedValue({
        checkedAt: new Date("2026-07-03T11:00:00.000Z"),
        status: ConnectionHealthStatus.Healthy,
      }),
    };
    const validatingProvider = new TikTokShopIntegrationProvider(restClient);

    await expect(validatingProvider.validateConnection(configuration)).resolves.toMatchObject({
      status: ConnectionHealthStatus.Healthy,
    });
    expect(restClient.validateConnection).toHaveBeenCalledWith({
      accessToken: "access-token",
      region: TikTokShopApiRegion.Europe,
      shopCipher: "shop_cipher_123",
      shopId: "shop_123",
    });
  });

  it("rejects validation when transient access token is missing", async () => {
    const { accessTokenHash, ...configurationWithoutAccessToken } = configuration;

    await expect(provider.validateConnection(configurationWithoutAccessToken)).rejects.toThrow(
      IntegrationAuthenticationError,
    );
    expect(accessTokenHash).toBe("access-token");
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
