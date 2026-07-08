import type { StorePlatform } from "./store-platform.enum.js";

export interface StoreOAuthStartResponse {
  readonly authorizationUrl: string;
  readonly platform: StorePlatform;
  readonly stateExpiresAt: string;
}
