import type { IntegrationCapabilities } from "../types/integration-capabilities.js";
import type { IntegrationConfiguration } from "../types/integration-configuration.js";
import type { IntegrationPlatform } from "../types/integration-platform.js";
import type { ConnectionHealth } from "../types/connection-health.js";
import type { SynchronisationContext } from "../types/synchronisation-context.js";
import type { SynchronisationResult } from "../types/synchronisation-result.js";

export interface IntegrationProvider {
  readonly platform: IntegrationPlatform;
  readonly capabilities: IntegrationCapabilities;

  connect(configuration: IntegrationConfiguration): Promise<ConnectionHealth>;
  disconnect(configuration: IntegrationConfiguration): Promise<ConnectionHealth>;
  validateConnection(configuration: IntegrationConfiguration): Promise<ConnectionHealth>;
  refreshAuthentication(configuration: IntegrationConfiguration): Promise<ConnectionHealth>;
  synchroniseOrders(context: SynchronisationContext): Promise<SynchronisationResult>;
  synchroniseProducts(context: SynchronisationContext): Promise<SynchronisationResult>;
  synchroniseCustomers(context: SynchronisationContext): Promise<SynchronisationResult>;
  synchroniseInventory(context: SynchronisationContext): Promise<SynchronisationResult>;
  synchroniseCategories(context: SynchronisationContext): Promise<SynchronisationResult>;
  synchroniseRefunds(context: SynchronisationContext): Promise<SynchronisationResult>;
}
