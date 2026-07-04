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
import { validateAmazonSellerConfiguration } from "./amazon-seller-configuration.js";
import {
  AmazonSellerRestClient,
  type AmazonSellerConnectionValidationRequest,
} from "./amazon-seller-rest-client.js";

export interface AmazonSellerConnectionValidator {
  validateConnection(request: AmazonSellerConnectionValidationRequest): Promise<ConnectionHealth>;
}

export class AmazonSellerIntegrationProvider implements IntegrationProvider {
  readonly platform = IntegrationPlatform.AmazonSeller;
  readonly capabilities: IntegrationCapabilities = READ_ONLY_COMMERCE_CAPABILITIES;

  constructor(private readonly restClient: AmazonSellerConnectionValidator = new AmazonSellerRestClient()) {}

  connect(configuration: IntegrationConfiguration): Promise<ConnectionHealth> {
    const amazonConfiguration = validateAmazonSellerConfiguration(configuration);
    return Promise.reject(
      this.createPlaceholderError("connect", { marketplaceId: amazonConfiguration.marketplaceId }),
    );
  }

  disconnect(configuration: IntegrationConfiguration): Promise<ConnectionHealth> {
    const amazonConfiguration = validateAmazonSellerConfiguration(configuration);
    return Promise.reject(
      this.createPlaceholderError("disconnect", { marketplaceId: amazonConfiguration.marketplaceId }),
    );
  }

  validateConnection(configuration: IntegrationConfiguration): Promise<ConnectionHealth> {
    const amazonConfiguration = validateAmazonSellerConfiguration(configuration);

    if (!amazonConfiguration.accessToken) {
      return Promise.reject(
        new IntegrationAuthenticationError("Amazon Seller access token is required.", {
          platform: this.platform,
          metadata: { marketplaceId: amazonConfiguration.marketplaceId },
        }),
      );
    }

    return this.restClient.validateConnection({
      accessToken: amazonConfiguration.accessToken,
      marketplaceId: amazonConfiguration.marketplaceId,
      region: amazonConfiguration.region,
      sellerId: amazonConfiguration.sellerId,
    });
  }

  refreshAuthentication(configuration: IntegrationConfiguration): Promise<ConnectionHealth> {
    const amazonConfiguration = validateAmazonSellerConfiguration(configuration);
    return Promise.reject(
      this.createPlaceholderError("refreshAuthentication", {
        marketplaceId: amazonConfiguration.marketplaceId,
      }),
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
      `Amazon Seller ${operation} is managed by the Salense connection service.`,
      { platform: this.platform, metadata: { operation, ...metadata } },
    );
  }

  private createSynchronisationPlaceholderError(
    context: SynchronisationContext,
    resource: SynchronisationResource,
  ): IntegrationNotImplementedError {
    return new IntegrationNotImplementedError(
      `Amazon Seller ${resource} synchronisation is handled by the Salense sync service.`,
      {
        platform: this.platform,
        metadata: {
          businessId: context.businessId,
          resource,
          storeId: context.storeId,
        },
      },
    );
  }
}

