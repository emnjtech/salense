import { NestFactory } from "@nestjs/core";
import { StoreIntegrationsModule } from "./store-integrations/store-integrations.module.js";
import {
  syncQueueName,
  WooCommerceSyncJobName,
  wooCommerceSyncJobNames,
} from "./store-integrations/sync-queue/sync-queue.types.js";
import { WooCommerceSyncWorkerHandler } from "./store-integrations/sync-queue/woocommerce-sync-worker.handler.js";

export { syncQueueName, WooCommerceSyncJobName, wooCommerceSyncJobNames };

export interface WooCommerceSyncWorkerHandlerContext {
  readonly close: () => Promise<void>;
  readonly handler: WooCommerceSyncWorkerHandler;
}

export async function createWooCommerceSyncWorkerHandlerContext(): Promise<WooCommerceSyncWorkerHandlerContext> {
  const app = await NestFactory.createApplicationContext(StoreIntegrationsModule, {
    logger: false,
  });

  return {
    close: () => app.close(),
    handler: app.get(WooCommerceSyncWorkerHandler),
  };
}
