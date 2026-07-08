"use client";

import { AlertCircle, CheckCircle2, Loader2, RefreshCcw, Search, ShoppingCart } from "lucide-react";
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  OrdersClientError,
  createOrdersApiClient,
  type CommerceOrderFilters,
  type CommerceOrderListItem,
} from "../../lib/api/orders-client";
import { StorePlatform } from "../../lib/api/store-integrations-client";
import { getFriendlyAuthErrorMessage, readDemoSession } from "../../lib/auth-session";
import { PlatformIcon } from "../brand/platform-icon";
import { WorkspaceContextBanner } from "../workspace/workspace-context-banner";
import { OrderStatusBadge, isRevenueEligibleOrderStatus } from "./order-status-badge";

const allPlatforms = "ALL";

interface OrdersFilterState {
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly platform: StorePlatform | typeof allPlatforms;
  readonly search: string;
  readonly status: string;
}

const emptyFilters: OrdersFilterState = {
  dateFrom: "",
  dateTo: "",
  platform: allPlatforms,
  search: "",
  status: "",
};

export function OrdersWorkspace() {
  const ordersClient = useMemo(() => createOrdersApiClient(), []);
  const [orders, setOrders] = useState<readonly CommerceOrderListItem[]>([]);
  const [filters, setFilters] = useState<OrdersFilterState>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiFilters = useMemo(() => toApiFilters(filters), [filters]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    const session = readDemoSession();

    if (!session) {
      setOrders([]);
      setError("Sign in to view unified orders.");
      setLoading(false);
      return;
    }

    try {
      const response = await ordersClient.listOrders(session.accessToken, apiFilters);
      setOrders(response.orders);
    } catch (caughtError) {
      setOrders([]);
      setError(getFriendlyError(caughtError));
    } finally {
      setLoading(false);
    }
  }, [apiFilters, ordersClient]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const platform = params.get("platform");
    const dateFrom = params.get("dateFrom");
    const dateTo = params.get("dateTo");

    setFilters((current) => ({
      ...current,
      ...(isStorePlatform(platform) ? { platform } : {}),
      ...(dateFrom ? { dateFrom: toDateInputValue(dateFrom) } : {}),
      ...(dateTo ? { dateTo: toDateInputValue(dateTo) } : {}),
    }));
  }, []);

  const visibleOrders = useMemo(
    () => applySearch(orders, filters.search),
    [filters.search, orders],
  );
  const revenueValue = visibleOrders.reduce(
    (total, order) =>
      total +
      (order.revenueEligible || isRevenueEligibleOrderStatus(order.status)
        ? (order.totalValue ?? 0)
        : 0),
    0,
  );
  const uniquePlatforms = new Set(visibleOrders.map((order) => order.platform)).size;

  function updateFilter<Key extends keyof OrdersFilterState>(
    key: Key,
    value: OrdersFilterState[Key],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="workspace orders-workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Unified Orders</p>
          <h1>Every channel's orders in one operating view.</h1>
          <p>
            Filter WooCommerce, Amazon Seller, TikTok Shop, and Shopify orders while preserving each
            platform's identity, customer context, and transaction values.
          </p>
        </div>
        <button className="secondary-button" onClick={() => void loadOrders()} type="button">
          <RefreshCcw size={16} aria-hidden="true" />
          Refresh
        </button>
      </header>

      <WorkspaceContextBanner />

      {error ? (
        <section className="state-banner error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          {error}
        </section>
      ) : null}

      {!error ? (
        <>
          {visibleOrders.length > 0 ? (
            <section className="overview-grid" aria-label="Orders summary">
              <MetricTile label="Visible orders" value={visibleOrders.length.toString()} />
              <MetricTile
                label="Revenue value"
                value={formatCurrency(revenueValue, getPrimaryCurrency(visibleOrders))}
              />
              <MetricTile label="Platforms" value={uniquePlatforms.toString()} />
              <MetricTile
                label="Items"
                value={visibleOrders
                  .reduce((total, order) => total + order.itemCount, 0)
                  .toString()}
              />
            </section>
          ) : null}

          <section className="panel orders-panel">
            <div className="orders-toolbar">
              <label className="orders-search">
                <Search size={16} aria-hidden="true" />
                <input
                  onChange={(event) => updateFilter("search", event.target.value)}
                  placeholder="Search order, customer, store"
                  type="search"
                  value={filters.search}
                />
              </label>
              <select
                aria-label="Platform"
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  updateFilter(
                    "platform",
                    event.target.value as StorePlatform | typeof allPlatforms,
                  )
                }
                value={filters.platform}
              >
                <option value={allPlatforms}>All platforms</option>
                <option value={StorePlatform.WooCommerce}>WooCommerce</option>
                <option value={StorePlatform.AmazonSeller}>Amazon Seller</option>
                <option value={StorePlatform.TikTokShop}>TikTok Shop</option>
                <option value={StorePlatform.Shopify}>Shopify</option>
              </select>
              <input
                aria-label="Status"
                onChange={(event) => updateFilter("status", event.target.value)}
                placeholder="Status"
                value={filters.status}
              />
              <input
                aria-label="Date from"
                onChange={(event) => updateFilter("dateFrom", event.target.value)}
                type="date"
                value={filters.dateFrom}
              />
              <input
                aria-label="Date to"
                onChange={(event) => updateFilter("dateTo", event.target.value)}
                type="date"
                value={filters.dateTo}
              />
            </div>

            {loading ? <OrdersLoadingState /> : null}
            {!loading && visibleOrders.length === 0 ? <OrdersEmptyState /> : null}
            {!loading && visibleOrders.length > 0 ? <OrdersTable orders={visibleOrders} /> : null}
          </section>
        </>
      ) : null}
    </main>
  );
}

function OrdersTable({ orders }: { readonly orders: readonly CommerceOrderListItem[] }) {
  return (
    <div className="orders-table-wrap">
      <table className="orders-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Platform</th>
            <th>Store</th>
            <th>Date</th>
            <th>Status</th>
            <th>Items</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.orderId}>
              <td>
                <strong>{order.orderNumber}</strong>
                <span>{order.platformOrderId}</span>
              </td>
              <td>
                <strong>{order.customerName ?? "Guest customer"}</strong>
                <span>{order.customerEmail ?? "No email captured"}</span>
              </td>
              <td>
                <span className="platform-cell">
                  <PlatformIcon platform={order.platform} size="sm" />
                  {formatPlatform(order.platform)}
                </span>
              </td>
              <td>{order.storeName}</td>
              <td>{formatDate(order.orderDate)}</td>
              <td>
                <OrderStatusBadge status={order.status} />
              </td>
              <td>{order.itemCount}</td>
              <td>{formatCurrency(order.totalValue, order.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrdersLoadingState() {
  return (
    <section className="today-loading" aria-label="Loading orders">
      <Loader2 className="spin" size={24} aria-hidden="true" />
      <span>Preparing read-only orders from all four commerce channels...</span>
    </section>
  );
}

function OrdersEmptyState() {
  return (
    <div className="empty-state orders-empty-state">
      <ShoppingCart size={22} aria-hidden="true" />
      <strong>No orders imported yet</strong>
      <span>
        Connect your first commerce platform and run your first synchronization to see orders here.
      </span>
    </div>
  );
}

function MetricTile({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="metric-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>
        <CheckCircle2 size={14} aria-hidden="true" />
        Read-only
      </small>
    </div>
  );
}

function toApiFilters(filters: OrdersFilterState): CommerceOrderFilters {
  return {
    ...(filters.platform !== allPlatforms ? { platform: filters.platform } : {}),
    ...(filters.status.trim() ? { status: filters.status.trim() } : {}),
    ...(filters.dateFrom ? { dateFrom: toStartOfDay(filters.dateFrom) } : {}),
    ...(filters.dateTo ? { dateTo: toEndOfDay(filters.dateTo) } : {}),
  };
}

function applySearch(
  orders: readonly CommerceOrderListItem[],
  searchTerm: string,
): readonly CommerceOrderListItem[] {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  if (!normalizedSearch) {
    return orders;
  }

  return orders.filter((order) =>
    [
      order.orderNumber,
      order.platformOrderId,
      order.customerName,
      order.customerEmail,
      order.storeName,
      order.status,
      formatPlatform(order.platform),
    ]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(normalizedSearch)),
  );
}

function getFriendlyError(error: unknown): string {
  const authMessage = getFriendlyAuthErrorMessage(error);

  if (authMessage) {
    return authMessage;
  }

  if (error instanceof OrdersClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load unified orders.";
}

function getPrimaryCurrency(orders: readonly CommerceOrderListItem[]): string | null {
  return orders.find((order) => order.currency)?.currency ?? "GBP";
}

function formatCurrency(value: number | null, currency: string | null): string {
  if (value === null) {
    return "Not captured";
  }

  return new Intl.NumberFormat("en-GB", {
    currency: currency ?? "GBP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Not captured";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatPlatform(platform: StorePlatform): string {
  switch (platform) {
    case StorePlatform.AmazonSeller:
      return "Amazon Seller";
    case StorePlatform.TikTokShop:
      return "TikTok Shop";
    case StorePlatform.Shopify:
      return "Shopify";
    case StorePlatform.WooCommerce:
      return "WooCommerce";
  }
}

function toStartOfDay(value: string): string {
  return `${value}T00:00:00.000Z`;
}

function toEndOfDay(value: string): string {
  return `${value}T23:59:59.999Z`;
}

function toDateInputValue(value: string): string {
  return value.slice(0, 10);
}

function isStorePlatform(value: string | null): value is StorePlatform {
  return Object.values(StorePlatform).includes(value as StorePlatform);
}
