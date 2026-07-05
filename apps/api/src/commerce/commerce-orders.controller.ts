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
import { CommerceOrdersService } from "./commerce-orders.service.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { ListCommerceOrdersQueryDto } from "./dto/list-commerce-orders-query.dto.js";
import type { CommerceOrderListResponse } from "./types/commerce-order-list-response.type.js";

@Controller("commerce/orders")
export class CommerceOrdersController {
  constructor(
    @Inject(CommerceOrdersService) private readonly commerceOrdersService: CommerceOrdersService,
  ) {}

  @Get()
  @UseGuards(JwtAccessTokenGuard)
  listOrders(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListCommerceOrdersQueryDto,
  ): Promise<CommerceOrderListResponse> {
    const userId = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException("Authenticated request context is not available.");
    }

    return this.commerceOrdersService.listOrders(userId, query);
  }
}
