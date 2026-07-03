import type { IntegrationPlatform } from "./integration-platform.js";

export enum SynchronisationResource {
  Orders = "ORDERS",
  Products = "PRODUCTS",
  Customers = "CUSTOMERS",
  Inventory = "INVENTORY",
  Categories = "CATEGORIES",
  Refunds = "REFUNDS",
}

export enum SynchronisationStatus {
  Completed = "COMPLETED",
  Partial = "PARTIAL",
  Failed = "FAILED",
  NotImplemented = "NOT_IMPLEMENTED",
}

export interface SynchronisationResult {
  readonly platform: IntegrationPlatform;
  readonly storeId: string;
  readonly resource: SynchronisationResource;
  readonly status: SynchronisationStatus;
  readonly startedAt: Date;
  readonly completedAt: Date;
  readonly recordsRead: number;
  readonly recordsWritten: 0;
  readonly message?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
