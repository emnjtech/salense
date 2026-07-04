export interface AmazonSellerRawOrdersResponse {
  readonly payload?: {
    readonly NextToken?: string;
    readonly Orders?: readonly AmazonSellerRawOrder[];
  };
}

export interface AmazonSellerRawOrder {
  readonly AmazonOrderId: string;
  readonly BuyerInfo?: {
    readonly BuyerEmail?: string;
    readonly BuyerName?: string;
  };
  readonly LastUpdateDate?: string;
  readonly MarketplaceId?: string;
  readonly NumberOfItemsShipped?: number;
  readonly NumberOfItemsUnshipped?: number;
  readonly OrderStatus?: string;
  readonly OrderTotal?: AmazonSellerRawMoney;
  readonly PurchaseDate?: string;
  readonly SalesChannel?: string;
}

export interface AmazonSellerRawOrderItemsResponse {
  readonly payload?: {
    readonly NextToken?: string;
    readonly OrderItems?: readonly AmazonSellerRawOrderItem[];
  };
}

export interface AmazonSellerRawOrderItem {
  readonly ASIN?: string;
  readonly ItemPrice?: AmazonSellerRawMoney;
  readonly ItemTax?: AmazonSellerRawMoney;
  readonly OrderItemId: string;
  readonly ProductInfo?: {
    readonly NumberOfItems?: number;
  };
  readonly QuantityOrdered?: number;
  readonly SellerSKU?: string;
  readonly Title?: string;
}

export interface AmazonSellerRawCatalogItemsResponse {
  readonly items?: readonly AmazonSellerRawCatalogItem[];
  readonly pagination?: {
    readonly nextToken?: string;
  };
}

export interface AmazonSellerRawCatalogItem {
  readonly asin: string;
  readonly attributes?: Readonly<Record<string, unknown>>;
  readonly productTypes?: readonly {
    readonly marketplaceId?: string;
    readonly productType?: string;
  }[];
  readonly summaries?: readonly {
    readonly itemName?: string;
    readonly marketplaceId?: string;
  }[];
}

export interface AmazonSellerRawInventorySummariesResponse {
  readonly inventorySummaries?: readonly AmazonSellerRawInventorySummary[];
  readonly pagination?: {
    readonly nextToken?: string;
  };
}

export interface AmazonSellerRawInventorySummary {
  readonly asin?: string;
  readonly condition?: string;
  readonly fnSku?: string;
  readonly inventoryDetails?: {
    readonly fulfillableQuantity?: number;
  };
  readonly sellerSku: string;
  readonly totalQuantity?: number;
}

export interface AmazonSellerRawFinancialEventsResponse {
  readonly payload?: {
    readonly FinancialEvents?: {
      readonly RefundEventList?: readonly AmazonSellerRawRefundEvent[];
    };
    readonly NextToken?: string;
  };
}

export interface AmazonSellerRawRefundEvent {
  readonly AmazonOrderId?: string;
  readonly PostedDate?: string;
  readonly SellerOrderId?: string;
  readonly ShipmentItemAdjustmentList?: readonly {
    readonly ItemChargeAdjustmentList?: readonly {
      readonly ChargeAmount?: AmazonSellerRawMoney;
      readonly ChargeType?: string;
    }[];
    readonly SellerSKU?: string;
    readonly ShipmentItemId?: string;
  }[];
}

export interface AmazonSellerRawMoney {
  readonly Amount?: string | number;
  readonly CurrencyCode?: string;
}

