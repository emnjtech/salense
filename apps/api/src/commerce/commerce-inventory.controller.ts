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
import { CommerceInventoryService } from "./commerce-inventory.service.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest validation requires runtime DTO metadata.
import { ListCommerceInventoryQueryDto } from "./dto/list-commerce-inventory-query.dto.js";
import type { CommerceInventoryListResponse } from "./types/commerce-inventory-list-response.type.js";

@Controller("commerce/inventory")
export class CommerceInventoryController {
  constructor(
    @Inject(CommerceInventoryService)
    private readonly commerceInventoryService: CommerceInventoryService,
  ) {}

  @Get()
  @UseGuards(JwtAccessTokenGuard)
  listInventory(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListCommerceInventoryQueryDto,
  ): Promise<CommerceInventoryListResponse> {
    const userId = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException("Authenticated request context is not available.");
    }

    return this.commerceInventoryService.listInventory(userId, query);
  }
}
