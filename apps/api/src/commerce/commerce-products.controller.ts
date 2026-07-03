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
import { CommerceProductsService } from "./commerce-products.service.js";
import type { ListCommerceProductsQueryDto } from "./dto/list-commerce-products-query.dto.js";
import type { CommerceProductListResponse } from "./types/commerce-product-list-response.type.js";

@Controller("commerce/products")
export class CommerceProductsController {
  constructor(
    @Inject(CommerceProductsService)
    private readonly commerceProductsService: CommerceProductsService,
  ) {}

  @Get()
  @UseGuards(JwtAccessTokenGuard)
  listProducts(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListCommerceProductsQueryDto,
  ): Promise<CommerceProductListResponse> {
    const userId = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException("Authenticated request context is not available.");
    }

    return this.commerceProductsService.listProducts(userId, query);
  }
}
