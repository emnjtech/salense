import {
  createPlaceholderIntegrationRegistry,
  INTEGRATION_FACTORY,
  INTEGRATION_REGISTRY,
  IntegrationFactory,
  IntegrationPlatform,
} from "../index.js";

describe("integration dependency injection exports", () => {
  it("exposes stable tokens for app-level dependency injection", () => {
    expect(INTEGRATION_REGISTRY).toBe(Symbol.for("salense.integrationRegistry"));
    expect(INTEGRATION_FACTORY).toBe(Symbol.for("salense.integrationFactory"));
  });

  it("creates a placeholder registry discoverable by platform type", () => {
    const registry = createPlaceholderIntegrationRegistry();
    const factory = new IntegrationFactory(registry);

    expect(factory.getProvider(IntegrationPlatform.WooCommerce).platform).toBe(
      IntegrationPlatform.WooCommerce,
    );
    expect(factory.getProvider(IntegrationPlatform.AmazonSeller).platform).toBe(
      IntegrationPlatform.AmazonSeller,
    );
    expect(factory.getProvider(IntegrationPlatform.TikTokShop).platform).toBe(
      IntegrationPlatform.TikTokShop,
    );
  });
});
