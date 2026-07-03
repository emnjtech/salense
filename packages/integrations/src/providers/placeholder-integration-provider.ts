import { IntegrationNotImplementedError } from "../errors/integration-error.js";
import {
  READ_ONLY_COMMERCE_CAPABILITIES,
  type IntegrationCapabilities,
} from "../types/integration-capabilities.js";
import type { IntegrationConfiguration } from "../types/integration-configuration.js";
import type { IntegrationPlatform } from "../types/integration-platform.js";
import type { ConnectionHealth } from "../types/connection-health.js";
import type { SynchronisationContext } from "../types/synchronisation-context.js";
import {
  SynchronisationResource,
  type SynchronisationResult,
} from "../types/synchronisation-result.js";
import type { IntegrationProvider } from "./integration-provider.js";

export class PlaceholderIntegrationProvider implements IntegrationProvider {
  readonly capabilities: IntegrationCapabilities = READ_ONLY_COMMERCE_CAPABILITIES;

  constructor(readonly platform: IntegrationPlatform) {}

  connect(configuration: IntegrationConfiguration): Promise<ConnectionHealth> {
    void configuration;
    return Promise.reject(this.createPlaceholderError("connect"));
  }

  disconnect(configuration: IntegrationConfiguration): Promise<ConnectionHealth> {
    void configuration;
    return Promise.reject(this.createPlaceholderError("disconnect"));
  }

  validateConnection(configuration: IntegrationConfiguration): Promise<ConnectionHealth> {
    void configuration;
    return Promise.reject(this.createPlaceholderError("validateConnection"));
  }

  refreshAuthentication(configuration: IntegrationConfiguration): Promise<ConnectionHealth> {
    void configuration;
    return Promise.reject(this.createPlaceholderError("refreshAuthentication"));
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

  private createPlaceholderError(operation: string): IntegrationNotImplementedError {
    return new IntegrationNotImplementedError(
      `${operation} is not implemented for ${this.platform}. Official platform integration is required before this provider can be used.`,
      { platform: this.platform, metadata: { operation } },
    );
  }

  private createSynchronisationPlaceholderError(
    context: SynchronisationContext,
    resource: SynchronisationResource,
  ): IntegrationNotImplementedError {
    return new IntegrationNotImplementedError(
      `${resource} synchronisation is not implemented for ${this.platform}.`,
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
