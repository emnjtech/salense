import {
  AmazonSellerApiRegion,
  AmazonSellerIntegrationProvider,
  ConnectionHealthStatus,
  IntegrationAuthenticationError,
  IntegrationNotImplementedError,
  IntegrationPlatform,
  PlaceholderIntegrationProvider,
  SynchronisationResource,
  validateAmazonSellerConfiguration,
} from "../../../index.js";
import type { IntegrationProvider } from "../../integration-provider.js";

const provider = new AmazonSellerIntegrationProvider();

const configuration = {
  platform: IntegrationPlatform.AmazonSeller,
  businessId: "business_1",
  storeId: "store_amazon_1",
  storeName: "Amazon UK",
  region: "GB",
  consumerKey: "seller_123",
  consumerKeyMetadata: { configured: true, keyId: "seller_1" },
  accessTokenHash: "access-token",
  accessTokenMetadata: { configured: true, keyId: "access_1" },
  refreshTokenHash: "refresh-token",
  refreshTokenMetadata: { configured: true, keyId: "refresh_1" },
  apiVersion: "A1F83G8C2ARO7P",
};

const context = {
  platform: IntegrationPlatform.AmazonSeller,
  businessId: "business_1",
  storeId: "store_amazon_1",
  triggeredAt: new Date("2026-07-03T10:00:00.000Z"),
};

describe("AmazonSellerIntegrationProvider", () => {
  it("implements the shared integration provider contract", () => {
    const contractProvider: IntegrationProvider = provider;

    expect(contractProvider.platform).toBe(IntegrationPlatform.AmazonSeller);
    expect(contractProvider).toBeInstanceOf(AmazonSellerIntegrationProvider);
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

  it("validates Amazon Seller-specific configuration", () => {
    expect(validateAmazonSellerConfiguration(configuration)).toEqual({
      accessToken: "access-token",
      marketplaceId: "A1F83G8C2ARO7P",
      refreshToken: "refresh-token",
      region: AmazonSellerApiRegion.Europe,
      sellerId: "seller_123",
    });
  });

  it("rejects missing seller and marketplace identifiers", () => {
    expect(() =>
      validateAmazonSellerConfiguration({
        platform: IntegrationPlatform.AmazonSeller,
        businessId: "business_1",
      }),
    ).toThrow("Amazon Seller seller ID is required.");

    expect(() =>
      validateAmazonSellerConfiguration({
        platform: IntegrationPlatform.AmazonSeller,
        businessId: "business_1",
        consumerKey: "seller_123",
        region: "UNKNOWN",
      }),
    ).toThrow("Amazon Seller region is not supported.");
  });

  it("validates credentials through the read-only REST client", async () => {
    const restClient = {
      validateConnection: jest.fn().mockResolvedValue({
        checkedAt: new Date("2026-07-03T11:00:00.000Z"),
        status: ConnectionHealthStatus.Healthy,
      }),
    };
    const validatingProvider = new AmazonSellerIntegrationProvider(restClient);

    await expect(validatingProvider.validateConnection(configuration)).resolves.toMatchObject({
      status: ConnectionHealthStatus.Healthy,
    });
    expect(restClient.validateConnection).toHaveBeenCalledWith({
      accessToken: "access-token",
      marketplaceId: "A1F83G8C2ARO7P",
      region: AmazonSellerApiRegion.Europe,
      sellerId: "seller_123",
    });
  });

  it("rejects validation when transient access token is missing", async () => {
    const { accessTokenHash, ...configurationWithoutAccessToken } = configuration;

    await expect(
      provider.validateConnection(configurationWithoutAccessToken),
    ).rejects.toThrow(IntegrationAuthenticationError);
    expect(accessTokenHash).toBe("access-token");
  });

  it("keeps connection and synchronisation methods as explicit placeholders", async () => {
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
