import { IntegrationConfigurationError } from "../../errors/integration-error.js";
import type { IntegrationConfiguration } from "../../types/integration-configuration.js";
import { IntegrationPlatform } from "../../types/integration-platform.js";

export enum TikTokShopApiRegion {
  Europe = "EUROPE",
  NorthAmerica = "NORTH_AMERICA",
  SoutheastAsia = "SOUTHEAST_ASIA",
}

export interface TikTokShopConfiguration {
  readonly accessToken?: string;
  readonly refreshToken?: string;
  readonly region: TikTokShopApiRegion;
  readonly shopCipher: string;
  readonly shopId: string;
}

export function validateTikTokShopConfiguration(
  configuration: IntegrationConfiguration,
): TikTokShopConfiguration {
  if (configuration.platform !== IntegrationPlatform.TikTokShop) {
    throw new IntegrationConfigurationError("TikTok Shop configuration received the wrong platform.", {
      platform: configuration.platform,
    });
  }

  const shopId = configuration.consumerKey?.trim();
  const shopCipher = configuration.apiVersion?.trim();

  if (!shopId) {
    throw new IntegrationConfigurationError("TikTok Shop shop ID is required.", {
      platform: IntegrationPlatform.TikTokShop,
    });
  }

  if (!shopCipher) {
    throw new IntegrationConfigurationError("TikTok Shop shop cipher is required.", {
      platform: IntegrationPlatform.TikTokShop,
    });
  }

  return {
    ...(configuration.accessTokenHash ? { accessToken: configuration.accessTokenHash } : {}),
    ...(configuration.refreshTokenHash ? { refreshToken: configuration.refreshTokenHash } : {}),
    region: toTikTokShopApiRegion(configuration.region),
    shopCipher,
    shopId,
  };
}

export function toTikTokShopApiRegion(region: string | undefined): TikTokShopApiRegion {
  const normalizedRegion = region?.trim().toUpperCase();

  switch (normalizedRegion) {
    case "CA":
    case "MX":
    case "US":
    case "NA":
    case "NORTH_AMERICA":
      return TikTokShopApiRegion.NorthAmerica;
    case "ID":
    case "MY":
    case "PH":
    case "SG":
    case "TH":
    case "VN":
    case "SEA":
    case "SOUTHEAST_ASIA":
      return TikTokShopApiRegion.SoutheastAsia;
    case "DE":
    case "ES":
    case "FR":
    case "GB":
    case "IE":
    case "IT":
    case "UK":
    case "EU":
    case "EUROPE":
    case undefined:
      return TikTokShopApiRegion.Europe;
    default:
      throw new IntegrationConfigurationError("TikTok Shop region is not supported.", {
        platform: IntegrationPlatform.TikTokShop,
        metadata: { region },
      });
  }
}
