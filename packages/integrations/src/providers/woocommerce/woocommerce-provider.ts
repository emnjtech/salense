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
import { validateWooCommerceConfiguration } from "./woocommerce-configuration.js";
import {
  WooCommerceRestClient,
  type WooCommerceConnectionValidationRequest,
} from "./woocommerce-rest-client.js";

export interface WooCommerceConnectionValidator {
  validateConnection(request: WooCommerceConnectionValidationRequest): Promise<ConnectionHealth>;
}

export class WooCommerceIntegrationProvider implements IntegrationProvider {
  readonly platform = IntegrationPlatform.WooCommerce;
  readonly capabilities: IntegrationCapabilities = READ_ONLY_COMMERCE_CAPABILITIES;

  constructor(private readonly restClient: WooCommerceConnectionValidator = new WooCommerceRestClient()) {}

  connect(configuration: IntegrationConfiguration): Promise<ConnectionHealth> {
    const wooCommerceConfiguration = validateWooCommerceConfiguration(configuration);
    return Promise.reject(
      this.createPlaceholderError("connect", { storeUrl: wooCommerceConfiguration.storeUrl }),
    );
  }

  disconnect(configuration: IntegrationConfiguration): Promise<ConnectionHealth> {
    const wooCommerceConfiguration = validateWooCommerceConfiguration(configuration);
    return Promise.reject(
      this.createPlaceholderError("disconnect", { storeUrl: wooCommerceConfiguration.storeUrl }),
    );
  }

  validateConnection(configuration: IntegrationConfiguration): Promise<ConnectionHealth> {
    const wooCommerceConfiguration = validateWooCommerceConfiguration(configuration);

    if (!wooCommerceConfiguration.consumerKey || !wooCommerceConfiguration.consumerSecret) {
      return Promise.reject(
        new IntegrationAuthenticationError("WooCommerce consumer credentials are required.", {
          platform: this.platform,
          metadata: { storeUrl: wooCommerceConfiguration.storeUrl },
        }),
      );
    }

    return this.restClient.validateConnection({
      storeUrl: wooCommerceConfiguration.storeUrl,
      consumerKey: wooCommerceConfiguration.consumerKey,
      consumerSecret: wooCommerceConfiguration.consumerSecret,
      apiVersion: wooCommerceConfiguration.apiVersion,
    });
  }

  refreshAuthentication(configuration: IntegrationConfiguration): Promise<ConnectionHealth> {
    const wooCommerceConfiguration = validateWooCommerceConfiguration(configuration);
    return Promise.reject(
      this.createPlaceholderError("refreshAuthentication", {
        storeUrl: wooCommerceConfiguration.storeUrl,
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
      `WooCommerce ${operation} requires the WooCommerce REST API and is not implemented yet.`,
      { platform: this.platform, metadata: { operation, ...metadata } },
    );
  }

  private createSynchronisationPlaceholderError(
    context: SynchronisationContext,
    resource: SynchronisationResource,
  ): IntegrationNotImplementedError {
    return new IntegrationNotImplementedError(
      `WooCommerce ${resource} synchronisation requires the WooCommerce REST API and is not implemented yet.`,
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
