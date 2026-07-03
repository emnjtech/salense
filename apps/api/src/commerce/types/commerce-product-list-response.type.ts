import type { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";

export interface CommerceProductListItemResponse {
  readonly category: string | null;
  readonly currency: string | null;
  readonly currentStock: number | null;
  readonly platform: StorePlatform;
  readonly platformProductId: string;
  readonly price: number | null;
  readonly productId: string;
  readonly productName: string | null;
  readonly revenue: number;
  readonly sku: string | null;
  readonly stockStatus: string | null;
  readonly storeName: string;
  readonly unitsSold: number;
}

export interface CommerceProductListResponse {
  readonly products: readonly CommerceProductListItemResponse[];
}
