import { Test } from "@nestjs/testing";
import {
  INTEGRATION_FACTORY,
  INTEGRATION_REGISTRY,
  IntegrationFactory,
  IntegrationPlatform,
  IntegrationRegistry,
  PlaceholderIntegrationProvider,
  UnsupportedIntegrationPlatformError,
  WooCommerceIntegrationProvider,
} from "@salense/integrations";
import { IntegrationFrameworkModule } from "../integration-framework.module.js";

describe("IntegrationFrameworkModule", () => {
  it("resolves the integration factory and registry through API dependency injection", async () => {
    const testingModule = await Test.createTestingModule({
      imports: [IntegrationFrameworkModule],
    }).compile();

    expect(testingModule.get(INTEGRATION_FACTORY)).toBeInstanceOf(IntegrationFactory);
    expect(testingModule.get(INTEGRATION_REGISTRY)).toBeInstanceOf(IntegrationRegistry);
  });

  it("resolves the WooCommerce-specific provider and generic placeholders for other Version 1 platforms", async () => {
    const testingModule = await Test.createTestingModule({
      imports: [IntegrationFrameworkModule],
    }).compile();
    const factory = testingModule.get<IntegrationFactory>(INTEGRATION_FACTORY);

    const wooCommerceProvider = factory.getProvider(IntegrationPlatform.WooCommerce);
    const amazonProvider = factory.getProvider(IntegrationPlatform.AmazonSeller);
    const tikTokProvider = factory.getProvider(IntegrationPlatform.TikTokShop);

    expect(wooCommerceProvider).toBeInstanceOf(WooCommerceIntegrationProvider);
    expect(wooCommerceProvider).not.toBeInstanceOf(PlaceholderIntegrationProvider);
    expect(amazonProvider).toBeInstanceOf(PlaceholderIntegrationProvider);
    expect(amazonProvider.platform).toBe(
      IntegrationPlatform.AmazonSeller,
    );
    expect(tikTokProvider).toBeInstanceOf(PlaceholderIntegrationProvider);
    expect(tikTokProvider.platform).toBe(IntegrationPlatform.TikTokShop);
  });

  it("rejects unsupported platforms", async () => {
    const testingModule = await Test.createTestingModule({
      imports: [IntegrationFrameworkModule],
    }).compile();
    const factory = testingModule.get<IntegrationFactory>(INTEGRATION_FACTORY);

    expect(() => factory.getProvider("SHOPIFY" as IntegrationPlatform)).toThrow(
      UnsupportedIntegrationPlatformError,
    );
  });
});
