import { Body, Controller, Inject, NotImplementedException, Put } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { CompanyProfileRequestDto } from "./dto/company-profile-request.dto.js";
import { UsersService } from "./users.service.js";

@Controller("users")
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Put("company-profile")
  updateCompanyProfile(@Body() companyProfileRequest: CompanyProfileRequestDto): never {
    return this.usersService.updateCompanyProfile(companyProfileRequest);
  }

  @Put("profile")
  updateProfile(): never {
    throw new NotImplementedException("User profile updates are not implemented in the skeleton.");
  }
}
