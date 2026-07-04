import {
  IntegrationAuthenticationError,
  IntegrationNotImplementedError,
} from "../../errors/integration-error.js";
import {
  READ_ONLY_COMMERCE_CAPABILITIES,
  type IntegrationCapabilities,
} from "../../types/integration-capabilities.js";
import type { IntegrationConfiguration } from "../../types/integration-configuration.js";
import { IntegrationPlatform } from "../../types/integration-platform.js";
import type { ConnectionHealth } from "../../types/connection-health.js";
import type { SynchronisationContext } from "../../types/synchronisation-context.js";
import {
  SynchronisationResource,
  type SynchronisationResult,
} from "../../types/synchronisation-result.js";
import type { IntegrationProvider } from "../integration-provider.js";
import { validateTikTokShopConfiguration } from "./tiktok-shop-configuration.js";
import {
  TikTokShopRestClient,
  type TikTokShopConnectionValidationRequest,
} from "./tiktok-shop-rest-client.js";

export interface TikTokShopConnectionValidator {
  validateConnection(request: TikTokShopConnectionValidationRequest): Promise<ConnectionHealth>;
}

export class TikTokShopIntegrationProvider implements IntegrationProvider {
  readonly platform = IntegrationPlatform.TikTokShop;
  readonly capabilities: IntegrationCapabilities = READ_ONLY_COMMERCE_CAPABILITIES;

  constructor(private readonly restClient: TikTokShopConnectionValidator = new TikTokShopRestClient()) {}

  connect(configuration: IntegrationConfiguration): Promise<ConnectionHealth> {
    const tikTokConfiguration = validateTikTokShopConfiguration(configuration);
    return Promise.reject(
      this.createPlaceholderError("connect", { shopId: tikTokConfiguration.shopId }),
    );
  }

  disconnect(configuration: IntegrationConfiguration): Promise<ConnectionHealth> {
    const tikTokConfiguration = validateTikTokShopConfiguration(configuration);
    return Promise.reject(
      this.createPlaceholderError("disconnect", { shopId: tikTokConfiguration.shopId }),
    );
  }

  validateConnection(configuration: IntegrationConfiguration): Promise<ConnectionHealth> {
    const tikTokConfiguration = validateTikTokShopConfiguration(configuration);

    if (!tikTokConfiguration.accessToken) {
      return Promise.reject(
        new IntegrationAuthenticationError("TikTok Shop access token is required.", {
          platform: this.platform,
          metadata: { shopId: tikTokConfiguration.shopId },
        }),
      );
    }

    return this.restClient.validateConnection({
      accessToken: tikTokConfiguration.accessToken,
      region: tikTokConfiguration.region,
      shopCipher: tikTokConfiguration.shopCipher,
      shopId: tikTokConfiguration.shopId,
    });
  }

  refreshAuthentication(configuration: IntegrationConfiguration): Promise<ConnectionHealth> {
    const tikTokConfiguration = validateTikTokShopConfiguration(configuration);
    return Promise.reject(
      this.createPlaceholderError("refreshAuthentication", { shopId: tikTokConfiguration.shopId }),
    );
  }

  synchroniseOrders(context: SynchronisationContext): Promise<SynchronisationResult> {
    return Promise.reject(this.createSynchronisationPlaceholderError(context, SynchronisationResource.Orders));
  }

  synchroniseProducts(context: SynchronisationContext): Promise<SynchronisationResult> {
    return Promise.reject(this.createSynchronisationPlaceholderError(context, SynchronisationResource.Products));
  }

  synchroniseCustomers(context: SynchronisationContext): Promise<SynchronisationResult> {
    return Promise.reject(this.createSynchronisationPlaceholderError(context, SynchronisationResource.Customers));
  }

  synchroniseInventory(context: SynchronisationContext): Promise<SynchronisationResult> {
    return Promise.reject(this.createSynchronisationPlaceholderError(context, SynchronisationResource.Inventory));
  }

  synchroniseCategories(context: SynchronisationContext): Promise<SynchronisationResult> {
    return Promise.reject(this.createSynchronisationPlaceholderError(context, SynchronisationResource.Categories));
  }

  synchroniseRefunds(context: SynchronisationContext): Promise<SynchronisationResult> {
    return Promise.reject(this.createSynchronisationPlaceholderError(context, SynchronisationResource.Refunds));
  }

  private createPlaceholderError(
    operation: string,
    metadata: Readonly<Record<string, unknown>> = {},
  ): IntegrationNotImplementedError {
    return new IntegrationNotImplementedError(
      `TikTok Shop ${operation} is managed by the Salense connection service.`,
      { metadata: { operation, ...metadata }, platform: this.platform },
    );
  }

  private createSynchronisationPlaceholderError(
    context: SynchronisationContext,
    resource: SynchronisationResource,
  ): IntegrationNotImplementedError {
    return new IntegrationNotImplementedError(
      `TikTok Shop ${resource} synchronisation is handled by the Salense sync service.`,
      {
        metadata: {
          businessId: context.businessId,
          resource,
          storeId: context.storeId,
        },
        platform: this.platform,
      },
    );
  }
}
