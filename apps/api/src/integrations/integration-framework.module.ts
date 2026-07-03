import { Module } from "@nestjs/common";
import {
  INTEGRATION_FACTORY,
  INTEGRATION_REGISTRY,
  IntegrationFactory,
  IntegrationPlatform,
  IntegrationRegistry,
  PlaceholderIntegrationProvider,
} from "@salense/integrations";

@Module({
  providers: [
    {
      provide: INTEGRATION_REGISTRY,
      useFactory: (): IntegrationRegistry =>
        new IntegrationRegistry([
          new PlaceholderIntegrationProvider(IntegrationPlatform.WooCommerce),
          new PlaceholderIntegrationProvider(IntegrationPlatform.AmazonSeller),
          new PlaceholderIntegrationProvider(IntegrationPlatform.TikTokShop),
        ]),
    },
    {
      provide: INTEGRATION_FACTORY,
      useFactory: (registry: IntegrationRegistry): IntegrationFactory =>
        new IntegrationFactory(registry),
      inject: [INTEGRATION_REGISTRY],
    },
  ],
  exports: [INTEGRATION_FACTORY, INTEGRATION_REGISTRY],
})
export class IntegrationFrameworkModule {}
