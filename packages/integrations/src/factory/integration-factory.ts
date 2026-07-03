import type { IntegrationProvider } from "../providers/integration-provider.js";
import type { IntegrationPlatform } from "../types/integration-platform.js";
import type { IntegrationRegistry } from "../registry/integration-registry.js";

export class IntegrationFactory {
  constructor(private readonly registry: IntegrationRegistry) {}

  getProvider(platform: IntegrationPlatform): IntegrationProvider {
    return this.registry.resolve(platform);
  }
}
