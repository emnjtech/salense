import type { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";

export interface CommerceProductDetailResponse {
  readonly product: CommerceProductDetail;
}

export interface CommerceProductDetail {
  readonly category: string | null;
  readonly currency: string | null;
  readonly currentStock: number | null;
  readonly importedAt: string | null;
  readonly insights: readonly CommerceProductInsight[];
  readonly lastSyncedAt: string | null;
  readonly platform: StorePlatform;
  readonly platformCreatedAt: string | null;
  readonly platformProductId: string;
  readonly platformUpdatedAt: string | null;
  readonly price: number | null;
  readonly productId: string;
  readonly productName: string | null;
  readonly productStatus: string | null;
  readonly productType: string | null;
  readonly recentSales: readonly CommerceProductRecentSale[];
  readonly regularPrice: number | null;
  readonly salePrice: number | null;
  readonly sales: CommerceProductSalesDetail;
  readonly sku: string | null;
  readonly stockStatus: string | null;
  readonly store: CommerceProductStoreDetail;
}

export interface CommerceProductStoreDetail {
  readonly connectedStoreId: string;
  readonly storeName: string;
  readonly storeUrl: string | null;
}

export interface CommerceProductSalesDetail {
  readonly averageOrderValue: number;
  readonly last30DaysRevenue: number;
  readonly last30DaysUnitsSold: number;
  readonly lastPurchaseDate: string | null;
  readonly salesRatePerDay: number;
  readonly totalOrders: number;
  readonly totalRevenue: number;
  readonly totalUnitsSold: number;
}

export interface CommerceProductRecentSale {
  readonly date: string | null;
  readonly orderNumber: string | null;
  readonly quantity: number;
  readonly revenue: number;
  readonly status: string | null;
}

export interface CommerceProductInsight {
  readonly severity: "INFO" | "SUCCESS" | "WARNING";
  readonly title: string;
  readonly message: string;
}
