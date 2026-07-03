import {
  DuplicateIntegrationProviderError,
  IntegrationRegistry,
  PlaceholderIntegrationProvider,
  UnsupportedIntegrationPlatformError,
  IntegrationPlatform,
} from "../index.js";

describe("IntegrationRegistry", () => {
  it("registers and resolves providers by platform", () => {
    const provider = new PlaceholderIntegrationProvider(IntegrationPlatform.WooCommerce);
    const registry = new IntegrationRegistry();

    registry.register(provider);

    expect(registry.resolve(IntegrationPlatform.WooCommerce)).toBe(provider);
    expect(registry.has(IntegrationPlatform.WooCommerce)).toBe(true);
    expect(registry.list()).toEqual([provider]);
  });

  it("registers constructor providers in order", () => {
    const wooCommerceProvider = new PlaceholderIntegrationProvider(IntegrationPlatform.WooCommerce);
    const amazonProvider = new PlaceholderIntegrationProvider(IntegrationPlatform.AmazonSeller);

    const registry = new IntegrationRegistry([wooCommerceProvider, amazonProvider]);

    expect(registry.list()).toEqual([wooCommerceProvider, amazonProvider]);
  });

  it("rejects duplicate provider registration", () => {
    const registry = new IntegrationRegistry([
      new PlaceholderIntegrationProvider(IntegrationPlatform.WooCommerce),
    ]);

    expect(() =>
      registry.register(new PlaceholderIntegrationProvider(IntegrationPlatform.WooCommerce)),
    ).toThrow(DuplicateIntegrationProviderError);
  });

  it("rejects unsupported platforms", () => {
    const registry = new IntegrationRegistry();

    expect(() => registry.resolve("SHOPIFY" as IntegrationPlatform)).toThrow(
      UnsupportedIntegrationPlatformError,
    );
  });

  it("rejects supported platforms that do not have a registered provider", () => {
    const registry = new IntegrationRegistry();

    expect(() => registry.resolve(IntegrationPlatform.TikTokShop)).toThrow(
      UnsupportedIntegrationPlatformError,
    );
  });
});
