import {
  Controller,
  Get,
  Inject,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  JwtAccessTokenGuard,
  type AuthenticatedRequest,
} from "../auth/guards/jwt-access-token.guard.js";
import { CommerceCustomersService } from "./commerce-customers.service.js";
import type { ListCommerceCustomersQueryDto } from "./dto/list-commerce-customers-query.dto.js";
import type { CommerceCustomerListResponse } from "./types/commerce-customer-list-response.type.js";

@Controller("commerce/customers")
export class CommerceCustomersController {
  constructor(
    @Inject(CommerceCustomersService)
    private readonly commerceCustomersService: CommerceCustomersService,
  ) {}

  @Get()
  @UseGuards(JwtAccessTokenGuard)
  listCustomers(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListCommerceCustomersQueryDto,
  ): Promise<CommerceCustomerListResponse> {
    const userId = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException("Authenticated request context is not available.");
    }

    return this.commerceCustomersService.listCustomers(userId, query);
  }
}
