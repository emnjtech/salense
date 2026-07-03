import {
  Body,
  Controller,
  Inject,
  NotImplementedException,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  JwtAccessTokenGuard,
  type AuthenticatedRequest,
} from "../auth/guards/jwt-access-token.guard.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { CompanyProfileRequestDto } from "./dto/company-profile-request.dto.js";
import type { CompanyProfileResponse } from "./types/company-profile-response.type.js";
import { UsersService } from "./users.service.js";

@Controller("users")
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Put("company-profile")
  @UseGuards(JwtAccessTokenGuard)
  updateCompanyProfile(
    @Req() request: AuthenticatedRequest,
    @Body() companyProfileRequest: CompanyProfileRequestDto,
  ): Promise<CompanyProfileResponse> {
    const userId = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException("Authenticated request context is not available.");
    }

    return this.usersService.updateCompanyProfile(userId, companyProfileRequest);
  }

  @Put("profile")
  updateProfile(): never {
    throw new NotImplementedException("User profile updates are not implemented in the skeleton.");
  }
}
