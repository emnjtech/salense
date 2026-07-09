import {
  Controller,
  Get,
  Inject,
  Param,
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
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { ListCommerceProductsQueryDto } from "./dto/list-commerce-products-query.dto.js";
import type { CommerceProductDetailResponse } from "./types/commerce-product-detail-response.type.js";
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

  @Get(":productId")
  @UseGuards(JwtAccessTokenGuard)
  getProductDetail(
    @Req() request: AuthenticatedRequest,
    @Param("productId") productId: string,
  ): Promise<CommerceProductDetailResponse> {
    const userId = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException("Authenticated request context is not available.");
    }

    return this.commerceProductsService.getProductDetail(userId, productId);
  }
}
