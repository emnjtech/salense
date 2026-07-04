import type { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";

export enum AuditAction {
  AmazonSellerConnectionCreated = "AMAZON_SELLER_CONNECTION_CREATED",
  AmazonSellerConnectionValidationFailed = "AMAZON_SELLER_CONNECTION_VALIDATION_FAILED",
  AmazonSellerConnectionValidationSucceeded = "AMAZON_SELLER_CONNECTION_VALIDATION_SUCCEEDED",
  TikTokShopConnectionCreated = "TIKTOK_SHOP_CONNECTION_CREATED",
  TikTokShopConnectionValidationFailed = "TIKTOK_SHOP_CONNECTION_VALIDATION_FAILED",
  TikTokShopConnectionValidationSucceeded = "TIKTOK_SHOP_CONNECTION_VALIDATION_SUCCEEDED",
  WooCommerceConnectionCreated = "WOOCOMMERCE_CONNECTION_CREATED",
  WooCommerceConnectionValidationSucceeded = "WOOCOMMERCE_CONNECTION_VALIDATION_SUCCEEDED",
  WooCommerceConnectionValidationFailed = "WOOCOMMERCE_CONNECTION_VALIDATION_FAILED",
  ManualSyncJobQueued = "MANUAL_SYNC_JOB_QUEUED",
  ScheduledSyncCreated = "SCHEDULED_SYNC_CREATED",
  ScheduledSyncRemoved = "SCHEDULED_SYNC_REMOVED",
  StoreDisconnected = "STORE_DISCONNECTED",
}

export enum AuditLogModule {
  StoreIntegrations = "STORE_INTEGRATIONS",
}

export enum AuditLogResult {
  Failure = "FAILURE",
  Success = "SUCCESS",
}

export interface CreateAuditLogEntry {
  readonly userId: string;
  readonly businessId: string;
  readonly action: AuditAction;
  readonly affectedModule: AuditLogModule;
  readonly affectedStoreId?: string;
  readonly affectedPlatform?: StorePlatform;
  readonly result: AuditLogResult;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
