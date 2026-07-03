import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import type { CompanyProfileRequestDto } from "./dto/company-profile-request.dto.js";
import type { CompanyProfileResponse } from "./types/company-profile-response.type.js";

interface CompanyProfilePrismaClient {
  readonly user: {
    findUnique(args: {
      readonly where: { readonly id: string };
      readonly select: { readonly id: true };
    }): Promise<{ readonly id: string } | null>;
  };
  readonly business: {
    upsert(args: {
      readonly where: { readonly ownerId: string };
      readonly create: {
        readonly ownerId: string;
        readonly name: string;
        readonly businessLogoUrl?: string;
        readonly country: string;
        readonly timeZone: string;
        readonly currency: string;
        readonly taxPreference: string;
        readonly industry: string;
      };
      readonly update: {
        readonly name: string;
        readonly businessLogoUrl?: string;
        readonly country: string;
        readonly timeZone: string;
        readonly currency: string;
        readonly taxPreference: string;
        readonly industry: string;
      };
      readonly select: {
        readonly id: true;
        readonly name: true;
        readonly businessLogoUrl: true;
        readonly country: true;
        readonly timeZone: true;
        readonly currency: true;
        readonly taxPreference: true;
        readonly industry: true;
      };
    }): Promise<{
      readonly id: string;
      readonly name: string;
      readonly businessLogoUrl: string | null;
      readonly country: string | null;
      readonly timeZone: string | null;
      readonly currency: string | null;
      readonly taxPreference: string | null;
      readonly industry: string | null;
    }>;
  };
}

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async updateCompanyProfile(
    userId: string,
    companyProfileRequest: CompanyProfileRequestDto,
  ): Promise<CompanyProfileResponse> {
    const prisma = this.prismaService.client as unknown as CompanyProfilePrismaClient;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new UnauthorizedException("Authenticated user could not be found.");
    }

    const profileData = {
      name: companyProfileRequest.businessName.trim(),
      ...(companyProfileRequest.businessLogoUrl
        ? { businessLogoUrl: companyProfileRequest.businessLogoUrl.trim() }
        : {}),
      country: companyProfileRequest.country.trim().toUpperCase(),
      timeZone: companyProfileRequest.timeZone.trim(),
      currency: companyProfileRequest.currency.trim().toUpperCase(),
      taxPreference: companyProfileRequest.taxPreference.trim(),
      industry: companyProfileRequest.industry.trim(),
    };

    const business = await prisma.business.upsert({
      where: { ownerId: user.id },
      create: {
        ownerId: user.id,
        ...profileData,
      },
      update: profileData,
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

    return {
      id: business.id,
      businessName: business.name,
      businessLogoUrl: business.businessLogoUrl,
      country: business.country ?? profileData.country,
      timeZone: business.timeZone ?? profileData.timeZone,
      currency: business.currency ?? profileData.currency,
      taxPreference: business.taxPreference ?? profileData.taxPreference,
      industry: business.industry ?? profileData.industry,
    };
  }
}
