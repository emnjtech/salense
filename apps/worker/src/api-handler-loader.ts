import type { Job } from "bullmq";
import type {
  AmazonSellerSyncJobName,
  ShopifySyncJobName,
  TikTokShopSyncJobName,
  WooCommerceSyncJobName,
} from "@salense/shared";

export interface WooCommerceSyncJobData {
  readonly platform: "WOOCOMMERCE";
  readonly queuedAt: string;
  readonly requestedByUserId: string;
  readonly resource: string;
  readonly storeId: string;
}

export type WooCommerceSyncJob = Job<
  WooCommerceSyncJobData,
  unknown,
  WooCommerceSyncJobName
>;

export interface AmazonSellerSyncJobData {
  readonly platform: "AMAZON_SELLER";
  readonly queuedAt: string;
  readonly requestedByUserId: string;
  readonly resource: string;
  readonly storeId: string;
}

export type AmazonSellerSyncJob = Job<
  AmazonSellerSyncJobData,
  unknown,
  AmazonSellerSyncJobName
>;

export interface TikTokShopSyncJobData {
  readonly platform: "TIKTOK_SHOP";
  readonly queuedAt: string;
  readonly requestedByUserId: string;
  readonly resource: string;
  readonly storeId: string;
}

export type TikTokShopSyncJob = Job<
  TikTokShopSyncJobData,
  unknown,
  TikTokShopSyncJobName
>;

export interface ShopifySyncJobData {
  readonly platform: "SHOPIFY";
  readonly queuedAt: string;
  readonly requestedByUserId: string;
  readonly resource: string;
  readonly storeId: string;
}

export type ShopifySyncJob = Job<
  ShopifySyncJobData,
  unknown,
  ShopifySyncJobName
>;

export type SyncJobData =
  | WooCommerceSyncJobData
  | AmazonSellerSyncJobData
  | TikTokShopSyncJobData
  | ShopifySyncJobData;
export type SyncJob =
  | WooCommerceSyncJob
  | AmazonSellerSyncJob
  | TikTokShopSyncJob
  | ShopifySyncJob;

export interface WooCommerceSyncJobHandler {
  handle(job: WooCommerceSyncJob): Promise<unknown>;
}

export interface AmazonSellerSyncJobHandler {
  handle(job: AmazonSellerSyncJob): Promise<unknown>;
}

export interface TikTokShopSyncJobHandler {
  handle(job: TikTokShopSyncJob): Promise<unknown>;
}

export interface ShopifySyncJobHandler {
  handle(job: ShopifySyncJob): Promise<unknown>;
}

export interface WooCommerceSyncJobHandlerContext {
  readonly close: () => Promise<void>;
  readonly amazonSellerHandler?: AmazonSellerSyncJobHandler;
  readonly handler: WooCommerceSyncJobHandler;
  readonly shopifyHandler?: ShopifySyncJobHandler;
  readonly tikTokShopHandler?: TikTokShopSyncJobHandler;
}

interface ApiWorkerModule {
  readonly createWooCommerceSyncWorkerHandlerContext?: () => Promise<WooCommerceSyncJobHandlerContext>;
}

type ModuleImporter = (specifier: string) => Promise<ApiWorkerModule>;

const dynamicImport = new Function("specifier", "return import(specifier)") as ModuleImporter;

export async function loadWooCommerceSyncJobHandlerContext(
  importModule: ModuleImporter = dynamicImport,
): Promise<WooCommerceSyncJobHandlerContext> {
  const apiWorkerModule = await importModule("@salense/api/worker");
  const createContext = apiWorkerModule.createWooCommerceSyncWorkerHandlerContext;

  if (!createContext) {
    throw new Error("WooCommerce sync worker handler export is not available.");
  }

  return createContext();
}
