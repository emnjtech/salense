import type { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";

export interface CommerceInventoryListItemResponse {
  readonly averageDailySales: number;
  readonly category: string | null;
  readonly currentStock: number | null;
  readonly estimatedDaysRemaining: number | null;
  readonly inventoryId: string;
  readonly inventoryValue: number;
  readonly platform: StorePlatform;
  readonly productName: string | null;
  readonly reorderLevel: number;
  readonly sku: string | null;
  readonly stockStatus: string | null;
  readonly storeName: string;
}

export interface CommerceInventoryInsightResponse {
  readonly message: string;
  readonly severity: "INFO" | "SUCCESS" | "WARNING";
  readonly type: "INVENTORY_VALUE" | "LOW_STOCK" | "NO_RECENT_SALES" | "STOCKOUT_RISK";
}

export interface CommerceInventorySummaryResponse {
  readonly inventoryValue: number;
  readonly lowStockProducts: number;
  readonly outOfStockProducts: number;
}

export interface CommerceInventoryListResponse {
  readonly insights: readonly CommerceInventoryInsightResponse[];
  readonly inventory: readonly CommerceInventoryListItemResponse[];
  readonly summary: CommerceInventorySummaryResponse;
}
