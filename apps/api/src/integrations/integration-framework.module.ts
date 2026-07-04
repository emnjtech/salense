import { Module } from "@nestjs/common";
import {
  AmazonSellerIntegrationProvider,
  INTEGRATION_FACTORY,
  INTEGRATION_REGISTRY,
  IntegrationFactory,
  IntegrationPlatform,
  IntegrationRegistry,
  PlaceholderIntegrationProvider,
  WooCommerceIntegrationProvider,
} from "@salense/integrations";

@Module({
  providers: [
    {
      provide: INTEGRATION_REGISTRY,
      useFactory: (): IntegrationRegistry =>
        new IntegrationRegistry([
          new WooCommerceIntegrationProvider(),
          new AmazonSellerIntegrationProvider(),
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
