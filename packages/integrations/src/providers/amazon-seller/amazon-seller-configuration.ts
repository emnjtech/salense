import { IntegrationConfigurationError } from "../../errors/integration-error.js";
import type { IntegrationConfiguration } from "../../types/integration-configuration.js";
import { IntegrationPlatform } from "../../types/integration-platform.js";

export enum AmazonSellerApiRegion {
  Europe = "EUROPE",
  FarEast = "FAR_EAST",
  NorthAmerica = "NORTH_AMERICA",
}

export interface AmazonSellerConfiguration {
  readonly accessToken?: string;
  readonly marketplaceId: string;
  readonly refreshToken?: string;
  readonly region: AmazonSellerApiRegion;
  readonly sellerId: string;
}

const defaultMarketplaceByRegion: Readonly<Record<string, string>> = {
  GB: "A1F83G8C2ARO7P",
  UK: "A1F83G8C2ARO7P",
  US: "ATVPDKIKX0DER",
};

export function validateAmazonSellerConfiguration(
  configuration: IntegrationConfiguration,
): AmazonSellerConfiguration {
  if (configuration.platform !== IntegrationPlatform.AmazonSeller) {
    throw new IntegrationConfigurationError(
      "Amazon Seller configuration received the wrong platform.",
      { platform: configuration.platform },
    );
  }

  const region = toAmazonSellerApiRegion(configuration.region);
  const sellerId = configuration.consumerKey?.trim();
  const marketplaceId =
    configuration.apiVersion?.trim() ??
    (configuration.region ? defaultMarketplaceByRegion[configuration.region.toUpperCase()] : undefined);

  if (!sellerId) {
    throw new IntegrationConfigurationError("Amazon Seller seller ID is required.", {
      platform: IntegrationPlatform.AmazonSeller,
    });
  }

  if (!marketplaceId) {
    throw new IntegrationConfigurationError("Amazon Seller marketplace ID is required.", {
      platform: IntegrationPlatform.AmazonSeller,
    });
  }

  return {
    ...(configuration.accessTokenHash ? { accessToken: configuration.accessTokenHash } : {}),
    marketplaceId,
    ...(configuration.refreshTokenHash ? { refreshToken: configuration.refreshTokenHash } : {}),
    region,
    sellerId,
  };
}

export function toAmazonSellerApiRegion(region: string | undefined): AmazonSellerApiRegion {
  const normalizedRegion = region?.trim().toUpperCase();

  switch (normalizedRegion) {
    case "CA":
    case "MX":
    case "US":
    case "NA":
    case "NORTH_AMERICA":
      return AmazonSellerApiRegion.NorthAmerica;
    case "AU":
    case "JP":
    case "SG":
    case "FE":
    case "FAR_EAST":
      return AmazonSellerApiRegion.FarEast;
    case "AE":
    case "DE":
    case "EG":
    case "ES":
    case "FR":
    case "GB":
    case "IN":
    case "IT":
    case "NL":
    case "PL":
    case "SA":
    case "SE":
    case "TR":
    case "UK":
    case "EU":
    case "EUROPE":
    case undefined:
      return AmazonSellerApiRegion.Europe;
    default:
      throw new IntegrationConfigurationError("Amazon Seller region is not supported.", {
        platform: IntegrationPlatform.AmazonSeller,
        metadata: { region },
      });
  }
}

