import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { WooCommerceApiVersion } from "@salense/integrations";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { PrepareStoreConnectionRequestDto } from "../dto/prepare-store-connection-request.dto.js";
import { StoreActionRequestDto } from "../dto/store-action-request.dto.js";
import { StorePlatform } from "../types/store-platform.enum.js";

async function validatePrepareConnection(payload: Record<string, unknown>) {
  return validate(plainToInstance(PrepareStoreConnectionRequestDto, payload));
}

describe("store integration DTO validation", () => {
  it("accepts a valid WooCommerce credential request without marketplace passwords", async () => {
    const errors = await validatePrepareConnection({
      platform: StorePlatform.WooCommerce,
      storeName: "Main Store",
      storeUrl: "https://shop.example.com",
      wooCommerceCredentials: {
        consumerKey: "ck_live_placeholder",
        consumerSecret: "cs_live_placeholder",
        apiVersion: WooCommerceApiVersion.WcV3,
      },
    });

    expect(errors).toHaveLength(0);
  });

  it("rejects WooCommerce requests with a missing store URL", async () => {
    const errors = await validatePrepareConnection({
      platform: StorePlatform.WooCommerce,
      storeName: "Main Store",
      wooCommerceCredentials: {
        consumerKey: "ck_live_placeholder",
        consumerSecret: "cs_live_placeholder",
        apiVersion: WooCommerceApiVersion.WcV3,
      },
    });

    expect(errors.some((error) => error.property === "storeUrl")).toBe(true);
  });

  it("rejects WooCommerce requests with a missing consumer key", async () => {
    const errors = await validatePrepareConnection({
      platform: StorePlatform.WooCommerce,
      storeName: "Main Store",
      storeUrl: "https://shop.example.com",
      wooCommerceCredentials: {
        consumerSecret: "cs_live_placeholder",
        apiVersion: WooCommerceApiVersion.WcV3,
      },
    });

    expect(JSON.stringify(errors)).toContain("consumerKey");
  });

  it("rejects WooCommerce requests with a missing consumer secret", async () => {
    const errors = await validatePrepareConnection({
      platform: StorePlatform.WooCommerce,
      storeName: "Main Store",
      storeUrl: "https://shop.example.com",
      wooCommerceCredentials: {
        consumerKey: "ck_live_placeholder",
        apiVersion: WooCommerceApiVersion.WcV3,
      },
    });

    expect(JSON.stringify(errors)).toContain("consumerSecret");
  });

  it("rejects unsupported WooCommerce API versions", async () => {
    const errors = await validatePrepareConnection({
      platform: StorePlatform.WooCommerce,
      storeName: "Main Store",
      storeUrl: "https://shop.example.com",
      wooCommerceCredentials: {
        consumerKey: "ck_live_placeholder",
        consumerSecret: "cs_live_placeholder",
        apiVersion: "wc/v2",
      },
    });

    expect(JSON.stringify(errors)).toContain("apiVersion");
  });

  it("accepts a valid Amazon Seller credential request without marketplace passwords", async () => {
    const errors = await validatePrepareConnection({
      amazonSellerCredentials: {
        accessToken: "access-token",
        marketplaceId: "A1F83G8C2ARO7P",
        refreshToken: "refresh-token",
        sellerId: "seller_123",
      },
      platform: StorePlatform.AmazonSeller,
      region: "GB",
      storeName: "Amazon UK",
    });

    expect(errors).toHaveLength(0);
  });

  it("rejects Amazon Seller requests with missing token credentials", async () => {
    const errors = await validatePrepareConnection({
      amazonSellerCredentials: {
        marketplaceId: "A1F83G8C2ARO7P",
        refreshToken: "refresh-token",
        sellerId: "seller_123",
      },
      platform: StorePlatform.AmazonSeller,
      region: "GB",
      storeName: "Amazon UK",
    });

    expect(JSON.stringify(errors)).toContain("accessToken");
  });

  it("accepts a valid TikTok Shop credential request without marketplace passwords", async () => {
    const errors = await validatePrepareConnection({
      platform: StorePlatform.TikTokShop,
      region: "GB",
      storeName: "TikTok UK",
      tikTokShopCredentials: {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        shopCipher: "shop_cipher_123",
        shopId: "shop_123",
      },
    });

    expect(errors).toHaveLength(0);
  });

  it("rejects TikTok Shop requests with missing token credentials", async () => {
    const errors = await validatePrepareConnection({
      platform: StorePlatform.TikTokShop,
      region: "GB",
      storeName: "TikTok UK",
      tikTokShopCredentials: {
        refreshToken: "refresh-token",
        shopCipher: "shop_cipher_123",
        shopId: "shop_123",
      },
    });

    expect(JSON.stringify(errors)).toContain("accessToken");
  });

  it("rejects unsupported platforms", async () => {
    const errors = await validatePrepareConnection({
      platform: "SHOPIFY",
      storeName: "Future Store",
    });

    expect(errors.some((error) => error.property === "platform")).toBe(true);
  });

  it("rejects marketplace password fields through the global validation contract", async () => {
    const validationPipe = new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    });

    await expect(
      validationPipe.transform(
        {
          platform: StorePlatform.WooCommerce,
          storeName: "Main Store",
          storeUrl: "https://shop.example.com",
          wooCommerceCredentials: {
            consumerKey: "ck_live_placeholder",
            consumerSecret: "cs_live_placeholder",
            apiVersion: WooCommerceApiVersion.WcV3,
          },
          marketplacePassword: "never-store-this",
        },
        { type: "body", metatype: PrepareStoreConnectionRequestDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("requires a store id for disconnect and sync actions", async () => {
    const errors = await validate(plainToInstance(StoreActionRequestDto, { storeId: "" }));

    expect(errors.some((error) => error.property === "storeId")).toBe(true);
  });
});
