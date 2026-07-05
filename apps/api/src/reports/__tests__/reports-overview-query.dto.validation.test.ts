import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";
import { ReportsOverviewQueryDto } from "../dto/reports-overview-query.dto.js";

describe("ReportsOverviewQueryDto", () => {
  it("accepts supported report filters", async () => {
    await expect(
      validate(
        plainToInstance(ReportsOverviewQueryDto, {
          dateFrom: "2026-07-01T00:00:00.000Z",
          dateTo: "2026-07-05T23:59:59.999Z",
          platform: StorePlatform.Shopify,
          store: "store_1",
        }),
      ),
    ).resolves.toEqual([]);
  });

  it("rejects unsupported platform filters", async () => {
    const errors = await validate(
      plainToInstance(ReportsOverviewQueryDto, { platform: "NOT_A_PLATFORM" }),
    );

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe("platform");
  });
});
