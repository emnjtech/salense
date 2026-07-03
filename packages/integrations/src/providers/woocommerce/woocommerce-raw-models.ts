export interface WooCommerceRawMoneyTotals {
  readonly total?: string;
  readonly subtotal?: string;
  readonly total_tax?: string;
}

export interface WooCommerceRawOrder {
  readonly id: number;
  readonly number?: string;
  readonly status?: string;
  readonly currency?: string;
  readonly discount_total?: string;
  readonly shipping_total?: string;
  readonly total?: string;
  readonly total_tax?: string;
  readonly date_created_gmt?: string;
  readonly date_modified_gmt?: string;
  readonly customer_id?: number;
  readonly line_items?: readonly WooCommerceRawOrderLineItem[];
  readonly refunds?: readonly WooCommerceRawOrderRefundReference[];
}

export interface WooCommerceRawOrderLineItem extends WooCommerceRawMoneyTotals {
  readonly id: number;
  readonly name?: string;
  readonly price?: number;
  readonly product_id?: number;
  readonly variation_id?: number;
  readonly quantity?: number;
  readonly sku?: string;
}

export interface WooCommerceRawOrderRefundReference {
  readonly id: number;
  readonly reason?: string;
  readonly total?: string;
}

export interface WooCommerceRawProduct {
  readonly id: number;
  readonly name?: string;
  readonly slug?: string;
  readonly sku?: string;
  readonly type?: string;
  readonly status?: string;
  readonly price?: string;
  readonly regular_price?: string;
  readonly sale_price?: string;
  readonly manage_stock?: boolean;
  readonly stock_quantity?: number | null;
  readonly stock_status?: string;
  readonly categories?: readonly WooCommerceRawProductCategoryReference[];
  readonly date_created_gmt?: string;
  readonly date_modified_gmt?: string;
}

export interface WooCommerceRawInventoryProduct {
  readonly id: number;
  readonly name?: string;
  readonly sku?: string;
  readonly manage_stock?: boolean;
  readonly stock_quantity?: number | null;
  readonly stock_status?: string;
  readonly date_modified_gmt?: string;
}

export interface WooCommerceRawProductCategoryReference {
  readonly id: number;
  readonly name?: string;
  readonly slug?: string;
}

export interface WooCommerceRawCustomer {
  readonly id: number;
  readonly email?: string;
  readonly first_name?: string;
  readonly last_name?: string;
  readonly username?: string;
  readonly role?: string;
  readonly date_created_gmt?: string;
  readonly date_modified_gmt?: string;
}

export interface WooCommerceRawProductCategory {
  readonly id: number;
  readonly name?: string;
  readonly slug?: string;
  readonly parent?: number;
  readonly count?: number;
}

export interface WooCommerceRawRefund extends WooCommerceRawMoneyTotals {
  readonly id: number;
  readonly status?: string;
  readonly reason?: string;
  readonly date_created_gmt?: string;
  readonly amount?: string;
  readonly refunded_by?: number;
  readonly refunded_payment?: boolean;
}
