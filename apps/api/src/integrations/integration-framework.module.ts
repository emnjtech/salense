import { Module } from "@nestjs/common";
import {
  AmazonSellerIntegrationProvider,
  INTEGRATION_FACTORY,
  INTEGRATION_REGISTRY,
  IntegrationFactory,
  IntegrationRegistry,
  ShopifyIntegrationProvider,
  TikTokShopIntegrationProvider,
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
          new TikTokShopIntegrationProvider(),
          new ShopifyIntegrationProvider(),
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
