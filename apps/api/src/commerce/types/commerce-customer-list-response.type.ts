import type { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";

export interface CommerceCustomerListItemResponse {
  readonly averageOrderValue: number;
  readonly city: string | null;
  readonly country: string | null;
  readonly customerEmail: string | null;
  readonly customerId: string;
  readonly customerName: string | null;
  readonly lastPurchaseDate: string | null;
  readonly lifetimeSpend: number;
  readonly platform: StorePlatform;
  readonly totalOrders: number;
}

export interface CommerceCustomersSummaryResponse {
  readonly highestLifetimeCustomer: {
    readonly customerId: string;
    readonly customerName: string | null;
    readonly lifetimeSpend: number;
  } | null;
  readonly newCustomers: number;
  readonly returningCustomers: number;
}

export interface CommerceCustomerListResponse {
  readonly customers: readonly CommerceCustomerListItemResponse[];
  readonly summary: CommerceCustomersSummaryResponse;
}
