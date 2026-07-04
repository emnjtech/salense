export interface TikTokShopRawMoney {
  readonly amount?: string;
  readonly currency?: string;
}

export interface TikTokShopRawOrderLineItem {
  readonly id: string;
  readonly product_id?: string;
  readonly product_name?: string;
  readonly sale_price?: TikTokShopRawMoney;
  readonly seller_sku?: string;
  readonly sku_id?: string;
  readonly sku_name?: string;
  readonly sku_quantity?: number;
}

export interface TikTokShopRawOrder {
  readonly buyer_email?: string;
  readonly buyer_uid?: string;
  readonly create_time?: number | string;
  readonly currency?: string;
  readonly id: string;
  readonly line_items?: readonly TikTokShopRawOrderLineItem[];
  readonly order_status?: string;
  readonly paid_time?: number | string;
  readonly payment?: {
    readonly original_shipping_fee?: TikTokShopRawMoney;
    readonly platform_discount?: TikTokShopRawMoney;
    readonly seller_discount?: TikTokShopRawMoney;
    readonly sub_total?: TikTokShopRawMoney;
    readonly tax?: TikTokShopRawMoney;
    readonly total_amount?: TikTokShopRawMoney;
  };
  readonly recipient_address?: {
    readonly city?: string;
    readonly country_code?: string;
    readonly name?: string;
  };
  readonly update_time?: number | string;
}

export interface TikTokShopRawProduct {
  readonly category_chains?: readonly {
    readonly id?: string;
    readonly is_leaf?: boolean;
    readonly local_name?: string;
    readonly parent_id?: string;
  }[];
  readonly create_time?: number | string;
  readonly id: string;
  readonly skus?: readonly {
    readonly id?: string;
    readonly inventory?: readonly {
      readonly quantity?: number;
      readonly warehouse_id?: string;
    }[];
    readonly price?: TikTokShopRawMoney;
    readonly seller_sku?: string;
  }[];
  readonly status?: string;
  readonly title?: string;
  readonly update_time?: number | string;
}

export interface TikTokShopRawInventory {
  readonly product_id: string;
  readonly product_name?: string;
  readonly quantity?: number;
  readonly seller_sku?: string;
  readonly sku_id?: string;
  readonly warehouse_id?: string;
}

export interface TikTokShopRawRefund {
  readonly create_time?: number | string;
  readonly currency?: string;
  readonly id: string;
  readonly order_id?: string;
  readonly reason?: string;
  readonly refund_amount?: TikTokShopRawMoney;
  readonly refund_status?: string;
  readonly update_time?: number | string;
}
