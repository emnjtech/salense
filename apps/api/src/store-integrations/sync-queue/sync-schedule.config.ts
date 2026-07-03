import { BadRequestException } from "@nestjs/common";
import { defaultSyncScheduleIntervalMs } from "./sync-queue.types.js";

const minimumScheduleIntervalMs = 5 * 60 * 1000;

export interface SyncScheduleConfig {
  readonly intervalMs: number;
}

export function loadSyncScheduleConfig(
  env: NodeJS.ProcessEnv = process.env,
): SyncScheduleConfig {
  const configuredInterval = env.SYNC_SCHEDULE_INTERVAL_MS?.trim();

  if (!configuredInterval) {
    return { intervalMs: defaultSyncScheduleIntervalMs };
  }

  const intervalMs = Number.parseInt(configuredInterval, 10);

  if (!Number.isFinite(intervalMs) || intervalMs < minimumScheduleIntervalMs) {
    throw new BadRequestException(
      "SYNC_SCHEDULE_INTERVAL_MS must be at least 300000 milliseconds.",
    );
  }

  return { intervalMs };
}
