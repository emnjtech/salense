import { bootstrapSyncWorker } from "./index.js";

bootstrapSyncWorker().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Salense sync worker failed to start.");
  process.exitCode = 1;
});
