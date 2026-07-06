import { UnauthorizedException } from "@nestjs/common";
import type { PrismaService } from "../../database/prisma.service.js";
import { UsersService } from "../users.service.js";

function createUsersServiceMocks(): {
  readonly service: UsersService;
  readonly findBusiness: jest.Mock;
  readonly findUser: jest.Mock;
  readonly upsertBusiness: jest.Mock;
} {
  const findBusiness = jest.fn();
  const findUser = jest.fn();
  const upsertBusiness = jest.fn();
  const prismaService = {
    client: {
      user: { findUnique: findUser },
      business: { findUnique: findBusiness, upsert: upsertBusiness },
    },
  } as unknown as PrismaService;

  return {
    service: new UsersService(prismaService),
    findBusiness,
    findUser,
    upsertBusiness,
  };
}

describe("UsersService", () => {
  it("returns the authenticated user's company profile", async () => {
    const { service, findBusiness } = createUsersServiceMocks();
    findBusiness.mockResolvedValue({
      id: "business_1",
      name: "Northstar Home Goods",
      businessLogoUrl: null,
      country: "GB",
      timeZone: "Europe/London",
      currency: "GBP",
      taxPreference: "VAT_REGISTERED",
      industry: "Homeware",
    });

    await expect(service.getCompanyProfile("user_1")).resolves.toEqual({
      id: "business_1",
      businessName: "Northstar Home Goods",
      businessLogoUrl: null,
      country: "GB",
      timeZone: "Europe/London",
      currency: "GBP",
      taxPreference: "VAT_REGISTERED",
      industry: "Homeware",
    });
    expect(findBusiness).toHaveBeenCalledWith({
      where: { ownerId: "user_1" },
      select: {
        id: true,
        name: true,
        businessLogoUrl: true,
        country: true,
        timeZone: true,
        currency: true,
        taxPreference: true,
        industry: true,
      },
    });
  });

  it("rejects company profile reads for a missing profile", async () => {
    const { service, findBusiness } = createUsersServiceMocks();
    findBusiness.mockResolvedValue(null);

    await expect(service.getCompanyProfile("missing_user")).rejects.toThrow(UnauthorizedException);
  });

  it("updates the authenticated user's single company profile", async () => {
    const { service, findUser, upsertBusiness } = createUsersServiceMocks();
    findUser.mockResolvedValue({ id: "user_1" });
    upsertBusiness.mockResolvedValue({
      id: "business_1",
      name: "Example Company",
      businessLogoUrl: "https://example.com/logo.png",
      country: "GB",
      timeZone: "Europe/London",
      currency: "GBP",
      taxPreference: "standard",
      industry: "E-commerce",
    });

    await expect(
      service.updateCompanyProfile("user_1", {
        businessName: "Example Company",
        businessLogoUrl: "https://example.com/logo.png",
        country: "GB",
        timeZone: "Europe/London",
        currency: "GBP",
        taxPreference: "standard",
        industry: "E-commerce",
      }),
    ).resolves.toEqual({
      id: "business_1",
      businessName: "Example Company",
      businessLogoUrl: "https://example.com/logo.png",
      country: "GB",
      timeZone: "Europe/London",
      currency: "GBP",
      taxPreference: "standard",
      industry: "E-commerce",
    });
    expect(findUser).toHaveBeenCalledWith({
      where: { id: "user_1" },
      select: { id: true },
    });
    expect(upsertBusiness).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerId: "user_1" },
        create: expect.objectContaining({ ownerId: "user_1", name: "Example Company" }),
        update: expect.objectContaining({ name: "Example Company" }),
      }),
    );
  });

  it("clears the company logo when the profile sends null", async () => {
    const { service, findUser, upsertBusiness } = createUsersServiceMocks();
    findUser.mockResolvedValue({ id: "user_1" });
    upsertBusiness.mockResolvedValue({
      id: "business_1",
      name: "Example Company",
      businessLogoUrl: null,
      country: "GB",
      timeZone: "Europe/London",
      currency: "GBP",
      taxPreference: "standard",
      industry: "E-commerce",
    });

    await service.updateCompanyProfile("user_1", {
      businessName: "Example Company",
      businessLogoUrl: null,
      country: "GB",
      timeZone: "Europe/London",
      currency: "GBP",
      taxPreference: "standard",
      industry: "E-commerce",
    });

    expect(upsertBusiness).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ businessLogoUrl: null }),
        update: expect.objectContaining({ businessLogoUrl: null }),
      }),
    );
  });

  it("rejects company profile updates for a missing user", async () => {
    const { service, findUser, upsertBusiness } = createUsersServiceMocks();
    findUser.mockResolvedValue(null);

    await expect(
      service.updateCompanyProfile("deleted_user", {
        businessName: "Example Company",
        country: "GB",
        timeZone: "Europe/London",
        currency: "GBP",
        taxPreference: "standard",
        industry: "E-commerce",
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(upsertBusiness).not.toHaveBeenCalled();
  });

  it("excludes sensitive fields from the company profile response", async () => {
    const { service, findUser, upsertBusiness } = createUsersServiceMocks();
    findUser.mockResolvedValue({ id: "user_1" });
    upsertBusiness.mockResolvedValue({
      id: "business_1",
      name: "Example Company",
      businessLogoUrl: null,
      country: "GB",
      timeZone: "Europe/London",
      currency: "GBP",
      taxPreference: "standard",
      industry: "E-commerce",
      passwordHash: "hashed-password",
      tokenHash: "hashed-token",
    });

    const response = await service.updateCompanyProfile("user_1", {
      businessName: "Example Company",
      country: "GB",
      timeZone: "Europe/London",
      currency: "GBP",
      taxPreference: "standard",
      industry: "E-commerce",
    });

    expect(JSON.stringify(response)).not.toContain("hashed-password");
    expect(JSON.stringify(response)).not.toContain("hashed-token");
    expect(JSON.stringify(response)).not.toContain("token");
  });
});
