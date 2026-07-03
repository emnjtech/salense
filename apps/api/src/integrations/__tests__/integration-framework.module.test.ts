import { Test } from "@nestjs/testing";
import {
  INTEGRATION_FACTORY,
  INTEGRATION_REGISTRY,
  IntegrationFactory,
  IntegrationPlatform,
  IntegrationRegistry,
  UnsupportedIntegrationPlatformError,
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

  it("resolves placeholder providers for each Version 1 platform", async () => {
    const testingModule = await Test.createTestingModule({
      imports: [IntegrationFrameworkModule],
    }).compile();
    const factory = testingModule.get<IntegrationFactory>(INTEGRATION_FACTORY);

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
