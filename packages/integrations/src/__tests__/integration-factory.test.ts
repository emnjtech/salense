import {
  IntegrationFactory,
  IntegrationRegistry,
  PlaceholderIntegrationProvider,
  UnsupportedIntegrationPlatformError,
  IntegrationPlatform,
} from "../index.js";

describe("IntegrationFactory", () => {
  it("returns providers from the registry", () => {
    const provider = new PlaceholderIntegrationProvider(IntegrationPlatform.AmazonSeller);
    const factory = new IntegrationFactory(new IntegrationRegistry([provider]));

    expect(factory.getProvider(IntegrationPlatform.AmazonSeller)).toBe(provider);
  });

  it("propagates registry errors for unsupported providers", () => {
    const factory = new IntegrationFactory(new IntegrationRegistry());

    expect(() => factory.getProvider(IntegrationPlatform.WooCommerce)).toThrow(
      UnsupportedIntegrationPlatformError,
    );
  });
});
