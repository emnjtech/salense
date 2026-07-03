import type { Job } from "bullmq";
import type { WooCommerceSyncJobName } from "@salense/shared";

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

export interface WooCommerceSyncJobHandler {
  handle(job: WooCommerceSyncJob): Promise<unknown>;
}

export interface WooCommerceSyncJobHandlerContext {
  readonly close: () => Promise<void>;
  readonly handler: WooCommerceSyncJobHandler;
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
