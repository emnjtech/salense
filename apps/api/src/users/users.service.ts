import { Injectable, NotImplementedException } from "@nestjs/common";
import type { CompanyProfileRequestDto } from "./dto/company-profile-request.dto.js";

@Injectable()
export class UsersService {
  updateCompanyProfile(companyProfileRequest: CompanyProfileRequestDto): never {
    void companyProfileRequest;
    throw new NotImplementedException(
      "Company profile management is not implemented in the Phase 1 skeleton.",
    );
  }
}
