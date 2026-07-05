export interface ShopifyRawMoneySet {
  readonly shop_money?: {
    readonly amount?: string;
    readonly currency_code?: string;
  };
}

export interface ShopifyRawLineItem {
  readonly id: number | string;
  readonly name?: string;
  readonly price?: string;
  readonly price_set?: ShopifyRawMoneySet;
  readonly product_id?: number | string;
  readonly quantity?: number;
  readonly sku?: string;
  readonly title?: string;
  readonly total_discount?: string;
  readonly variant_id?: number | string;
  readonly variant_title?: string;
}

export interface ShopifyRawRefund {
  readonly created_at?: string;
  readonly id: number | string;
  readonly note?: string;
  readonly order_id?: number | string;
  readonly processed_at?: string;
  readonly refund_line_items?: readonly {
    readonly line_item?: ShopifyRawLineItem;
    readonly subtotal?: string;
    readonly total_tax?: string;
  }[];
  readonly transactions?: readonly {
    readonly amount?: string;
    readonly currency?: string;
    readonly status?: string;
  }[];
}

export interface ShopifyRawOrder {
  readonly billing_address?: ShopifyRawAddress;
  readonly contact_email?: string;
  readonly created_at?: string;
  readonly currency?: string;
  readonly current_subtotal_price?: string;
  readonly current_total_discounts?: string;
  readonly current_total_price?: string;
  readonly current_total_tax?: string;
  readonly customer?: ShopifyRawCustomer;
  readonly email?: string;
  readonly financial_status?: string;
  readonly fulfillment_status?: string;
  readonly id: number | string;
  readonly line_items?: readonly ShopifyRawLineItem[];
  readonly name?: string;
  readonly order_number?: number | string;
  readonly processed_at?: string;
  readonly refunds?: readonly ShopifyRawRefund[];
  readonly shipping_address?: ShopifyRawAddress;
  readonly total_shipping_price_set?: ShopifyRawMoneySet;
  readonly updated_at?: string;
}

export interface ShopifyRawAddress {
  readonly city?: string;
  readonly country?: string;
  readonly country_code?: string;
  readonly first_name?: string;
  readonly last_name?: string;
  readonly name?: string;
}

export interface ShopifyRawCustomer {
  readonly created_at?: string;
  readonly email?: string;
  readonly first_name?: string;
  readonly id: number | string;
  readonly last_name?: string;
  readonly phone?: string;
  readonly updated_at?: string;
}

export interface ShopifyRawProduct {
  readonly body_html?: string;
  readonly created_at?: string;
  readonly id: number | string;
  readonly product_type?: string;
  readonly published_at?: string | null;
  readonly status?: string;
  readonly tags?: string;
  readonly title?: string;
  readonly updated_at?: string;
  readonly variants?: readonly ShopifyRawProductVariant[];
  readonly vendor?: string;
}

export interface ShopifyRawProductVariant {
  readonly compare_at_price?: string | null;
  readonly id: number | string;
  readonly inventory_item_id?: number | string;
  readonly inventory_quantity?: number;
  readonly price?: string;
  readonly product_id?: number | string;
  readonly sku?: string;
  readonly title?: string;
}

export interface ShopifyRawInventory {
  readonly inventory_item_id?: number | string;
  readonly product_id: number | string;
  readonly product_title?: string;
  readonly quantity?: number;
  readonly sku?: string;
  readonly variant_id?: number | string;
}

export interface ShopifyRawCollection {
  readonly handle?: string;
  readonly id: number | string;
  readonly products_count?: number;
  readonly title?: string;
  readonly updated_at?: string;
}
