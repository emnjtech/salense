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
import { validateShopifyConfiguration } from "./shopify-configuration.js";
import {
  ShopifyRestClient,
  type ShopifyConnectionValidationRequest,
} from "./shopify-rest-client.js";

export interface ShopifyConnectionValidator {
  validateConnection(request: ShopifyConnectionValidationRequest): Promise<ConnectionHealth>;
}

export class ShopifyIntegrationProvider implements IntegrationProvider {
  readonly platform = IntegrationPlatform.Shopify;
  readonly capabilities: IntegrationCapabilities = READ_ONLY_COMMERCE_CAPABILITIES;

  constructor(private readonly restClient: ShopifyConnectionValidator = new ShopifyRestClient()) {}

  connect(configuration: IntegrationConfiguration): Promise<ConnectionHealth> {
    const shopifyConfiguration = validateShopifyConfiguration(configuration);
    return Promise.reject(
      this.createPlaceholderError("connect", { shopDomain: shopifyConfiguration.shopDomain }),
    );
  }

  disconnect(configuration: IntegrationConfiguration): Promise<ConnectionHealth> {
    const shopifyConfiguration = validateShopifyConfiguration(configuration);
    return Promise.reject(
      this.createPlaceholderError("disconnect", { shopDomain: shopifyConfiguration.shopDomain }),
    );
  }

  validateConnection(configuration: IntegrationConfiguration): Promise<ConnectionHealth> {
    const shopifyConfiguration = validateShopifyConfiguration(configuration);

    if (!shopifyConfiguration.accessToken) {
      return Promise.reject(
        new IntegrationAuthenticationError("Shopify access token is required.", {
          platform: this.platform,
          metadata: { shopDomain: shopifyConfiguration.shopDomain },
        }),
      );
    }

    return this.restClient.validateConnection({
      accessToken: shopifyConfiguration.accessToken,
      apiVersion: shopifyConfiguration.apiVersion,
      shopDomain: shopifyConfiguration.shopDomain,
    });
  }

  refreshAuthentication(configuration: IntegrationConfiguration): Promise<ConnectionHealth> {
    const shopifyConfiguration = validateShopifyConfiguration(configuration);
    return Promise.reject(
      this.createPlaceholderError("refreshAuthentication", { shopDomain: shopifyConfiguration.shopDomain }),
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
      `Shopify ${operation} is managed by the Salense connection service.`,
      { metadata: { operation, ...metadata }, platform: this.platform },
    );
  }

  private createSynchronisationPlaceholderError(
    context: SynchronisationContext,
    resource: SynchronisationResource,
  ): IntegrationNotImplementedError {
    return new IntegrationNotImplementedError(
      `Shopify ${resource} synchronisation is handled by the Salense sync service.`,
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
