import {
  IntegrationAuthenticationError,
  IntegrationConnectionError,
} from "../../errors/integration-error.js";
import { ConnectionHealthStatus, type ConnectionHealth } from "../../types/connection-health.js";
import { IntegrationPlatform } from "../../types/integration-platform.js";
import type { WooCommerceApiVersion } from "./woocommerce-configuration.js";

export interface WooCommerceConnectionValidationRequest {
  readonly storeUrl: string;
  readonly consumerKey: string;
  readonly consumerSecret: string;
  readonly apiVersion: WooCommerceApiVersion;
}

export interface WooCommerceRestClientOptions {
  readonly fetchFn?: typeof fetch;
  readonly timeoutMs?: number;
}

const defaultTimeoutMs = 10_000;

export class WooCommerceRestClient {
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: WooCommerceRestClientOptions = {}) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  }

  async validateConnection(
    request: WooCommerceConnectionValidationRequest,
  ): Promise<ConnectionHealth> {
    const endpoint = buildSystemStatusUrl(request.storeUrl, request.apiVersion);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(endpoint, {
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${Buffer.from(
            `${request.consumerKey}:${request.consumerSecret}`,
            "utf8",
          ).toString("base64")}`,
        },
        method: "GET",
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        throw new IntegrationAuthenticationError("WooCommerce authentication failed.", {
          platform: IntegrationPlatform.WooCommerce,
          metadata: { status: response.status },
        });
      }

      if (!response.ok) {
        throw new IntegrationConnectionError("WooCommerce store returned an error.", {
          platform: IntegrationPlatform.WooCommerce,
          metadata: { status: response.status },
        });
      }

      return {
        status: ConnectionHealthStatus.Healthy,
        checkedAt: new Date(),
        message: "WooCommerce credentials validated successfully.",
        metadata: {
          endpoint: endpoint.pathname,
          readOnly: true,
        },
      };
    } catch (error) {
      if (
        error instanceof IntegrationAuthenticationError ||
        error instanceof IntegrationConnectionError
      ) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new IntegrationConnectionError("WooCommerce validation timed out.", {
          platform: IntegrationPlatform.WooCommerce,
          cause: error,
        });
      }

      throw new IntegrationConnectionError("WooCommerce store is unreachable.", {
        platform: IntegrationPlatform.WooCommerce,
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

function buildSystemStatusUrl(storeUrl: string, apiVersion: WooCommerceApiVersion): URL {
  let baseUrl: URL;

  try {
    baseUrl = new URL(storeUrl);
  } catch (error) {
    throw new IntegrationConnectionError("WooCommerce store URL is invalid.", {
      platform: IntegrationPlatform.WooCommerce,
      cause: error,
    });
  }

  baseUrl.pathname = joinUrlPath(baseUrl.pathname, "wp-json", apiVersion, "system_status");
  baseUrl.search = "";
  baseUrl.hash = "";

  return baseUrl;
}

function joinUrlPath(...parts: readonly string[]): string {
  return `/${parts
    .flatMap((part) => part.split("/"))
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/")}`;
}
