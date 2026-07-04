import type { IntegrationPlatform } from "../types/integration-platform.js";

export interface IntegrationErrorOptions {
  readonly platform?: IntegrationPlatform;
  readonly cause?: unknown;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export class IntegrationError extends Error {
  readonly platform?: IntegrationPlatform;
  readonly metadata?: Readonly<Record<string, unknown>>;

  constructor(message: string, options: IntegrationErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    if (options.platform !== undefined) {
      this.platform = options.platform;
    }
    if (options.metadata !== undefined) {
      this.metadata = options.metadata;
    }
  }
}

export class UnsupportedIntegrationPlatformError extends IntegrationError {}

export class DuplicateIntegrationProviderError extends IntegrationError {}

export class IntegrationAuthenticationError extends IntegrationError {}

export class IntegrationConfigurationError extends IntegrationError {}

export class IntegrationConnectionError extends IntegrationError {}

export class IntegrationSynchronisationError extends IntegrationError {}

export class IntegrationNotImplementedError extends IntegrationError {}
