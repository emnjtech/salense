import type { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";

export interface CommerceOrderListItemResponse {
  readonly currency: string | null;
  readonly customerEmail: string | null;
  readonly customerName: string | null;
  readonly itemCount: number;
  readonly orderDate: string | null;
  readonly orderId: string;
  readonly orderNumber: string;
  readonly platform: StorePlatform;
  readonly platformOrderId: string;
  readonly revenueEligible: boolean;
  readonly status: string | null;
  readonly storeName: string;
  readonly totalValue: number | null;
}

export interface CommerceOrderListResponse {
  readonly orders: readonly CommerceOrderListItemResponse[];
}
