import type { IntegrationPlatform } from "./integration-platform.js";

export interface SynchronisationContext {
  readonly platform: IntegrationPlatform;
  readonly businessId: string;
  readonly storeId: string;
  readonly requestedByUserId?: string;
  readonly since?: Date;
  readonly triggeredAt: Date;
  readonly correlationId?: string;
}
