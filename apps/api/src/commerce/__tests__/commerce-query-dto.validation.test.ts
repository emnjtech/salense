import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";
import { CommerceCustomersController } from "../commerce-customers.controller.js";
import { CommerceInventoryController } from "../commerce-inventory.controller.js";
import { CommerceOrdersController } from "../commerce-orders.controller.js";
import { CommerceProductsController } from "../commerce-products.controller.js";
import { ListCommerceCustomersQueryDto } from "../dto/list-commerce-customers-query.dto.js";
import { ListCommerceInventoryQueryDto } from "../dto/list-commerce-inventory-query.dto.js";
import { ListCommerceOrdersQueryDto } from "../dto/list-commerce-orders-query.dto.js";
import { ListCommerceProductsQueryDto } from "../dto/list-commerce-products-query.dto.js";

const platformQueryDtos = [
  ["orders", ListCommerceOrdersQueryDto],
  ["products", ListCommerceProductsQueryDto],
  ["customers", ListCommerceCustomersQueryDto],
  ["inventory", ListCommerceInventoryQueryDto],
] as const;

describe("commerce query DTO validation", () => {
  it.each(platformQueryDtos)("accepts platform filters for %s", async (_name, Dto) => {
    await expect(
      validate(plainToInstance(Dto, { platform: StorePlatform.Shopify })),
    ).resolves.toEqual([]);
  });

  it.each(platformQueryDtos)("rejects unsupported platform filters for %s", async (_name, Dto) => {
    const errors = await validate(plainToInstance(Dto, { platform: "NOT_A_PLATFORM" }));

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe("platform");
  });

  it.each([
    ["orders", CommerceOrdersController, "listOrders", ListCommerceOrdersQueryDto],
    ["products", CommerceProductsController, "listProducts", ListCommerceProductsQueryDto],
    ["customers", CommerceCustomersController, "listCustomers", ListCommerceCustomersQueryDto],
    ["inventory", CommerceInventoryController, "listInventory", ListCommerceInventoryQueryDto],
  ] as const)(
    "keeps runtime DTO metadata for %s controller queries",
    (_name, Controller, methodName, Dto) => {
      const parameterTypes = Reflect.getMetadata(
        "design:paramtypes",
        Controller.prototype,
        methodName,
      ) as readonly unknown[] | undefined;

      expect(parameterTypes?.[1]).toBe(Dto);
    },
  );
});
