import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { PrepareStoreConnectionRequestDto } from "../dto/prepare-store-connection-request.dto.js";
import { StoreActionRequestDto } from "../dto/store-action-request.dto.js";
import { StorePlatform } from "../types/store-platform.enum.js";

async function validatePrepareConnection(payload: Record<string, unknown>) {
  return validate(plainToInstance(PrepareStoreConnectionRequestDto, payload));
}

describe("store integration DTO validation", () => {
  it("accepts a supported platform connection request without marketplace passwords", async () => {
    const errors = await validatePrepareConnection({
      platform: StorePlatform.WooCommerce,
      storeName: "Main Store",
      storeUrl: "https://shop.example.com",
    });

    expect(errors).toHaveLength(0);
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
