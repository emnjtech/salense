import {
  DuplicateIntegrationProviderError,
  UnsupportedIntegrationPlatformError,
} from "../errors/integration-error.js";
import type { IntegrationProvider } from "../providers/integration-provider.js";
import {
  isSupportedIntegrationPlatform,
  type IntegrationPlatform,
} from "../types/integration-platform.js";

export class IntegrationRegistry {
  private readonly providers = new Map<IntegrationPlatform, IntegrationProvider>();

  constructor(providers: readonly IntegrationProvider[] = []) {
    for (const provider of providers) {
      this.register(provider);
    }
  }

  register(provider: IntegrationProvider): void {
    this.assertSupportedPlatform(provider.platform);

    if (this.providers.has(provider.platform)) {
      throw new DuplicateIntegrationProviderError(
        `Integration provider already registered for ${provider.platform}.`,
        { platform: provider.platform },
      );
    }

    this.providers.set(provider.platform, provider);
  }

  resolve(platform: IntegrationPlatform): IntegrationProvider {
    this.assertSupportedPlatform(platform);
    const provider = this.providers.get(platform);

    if (!provider) {
      throw new UnsupportedIntegrationPlatformError(
        `No integration provider registered for ${platform}.`,
        { platform },
      );
    }

    return provider;
  }

  has(platform: IntegrationPlatform): boolean {
    return this.providers.has(platform);
  }

  list(): readonly IntegrationProvider[] {
    return [...this.providers.values()];
  }

  private assertSupportedPlatform(platform: string): asserts platform is IntegrationPlatform {
    if (!isSupportedIntegrationPlatform(platform)) {
      throw new UnsupportedIntegrationPlatformError(
        `Unsupported integration platform: ${platform}.`,
        { metadata: { platform } },
      );
    }
  }
}
