"use client";

import {
  AlertCircle,
  BarChart3,
  Boxes,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ReportsClientError,
  createReportsApiClient,
  type ReportsOverviewFilters,
  type ReportsOverviewResponse,
  type ReportsPlatformMetric,
  type ReportsStoreFilterOption,
  type ReportsTopCustomer,
  type ReportsTopProduct,
  type ReportsTrendPoint,
} from "../../lib/api/reports-client";
import { StorePlatform } from "../../lib/api/store-integrations-client";
import { getFriendlyAuthErrorMessage, readDemoSession } from "../../lib/auth-session";
import { PlatformIcon } from "../brand/platform-icon";

const allPlatforms = "ALL";
const allStores = "ALL";

type DateRangePreset = "TODAY" | "7_DAYS" | "30_DAYS" | "90_DAYS" | "YEAR" | "CUSTOM";

interface ReportsFilterState {
  readonly customDateFrom: string;
  readonly customDateTo: string;
  readonly dateRange: DateRangePreset;
  readonly platform: StorePlatform | typeof allPlatforms;
  readonly store: string;
}

const emptyFilters: ReportsFilterState = {
  customDateFrom: "",
  customDateTo: "",
  dateRange: "30_DAYS",
  platform: allPlatforms,
  store: allStores,
};

export function ReportsWorkspace() {
  const reportsClient = useMemo(() => createReportsApiClient(), []);
  const [overview, setOverview] = useState<ReportsOverviewResponse | null>(null);
  const [filters, setFilters] = useState<ReportsFilterState>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiFilters = useMemo(() => toApiFilters(filters), [filters]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    const session = readDemoSession();

    if (!session) {
      setOverview(null);
      setError("Sign in to view reports.");
      setLoading(false);
      return;
    }

    try {
      setOverview(await reportsClient.getOverview(session.accessToken, apiFilters));
    } catch (caughtError) {
      setOverview(null);
      setError(getFriendlyError(caughtError));
    } finally {
      setLoading(false);
    }
  }, [apiFilters, reportsClient]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  function updateFilter<Key extends keyof ReportsFilterState>(
    key: Key,
    value: ReportsFilterState[Key],
  ) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "platform" ? { store: allStores } : {}),
    }));
  }

  return (
    <main className="workspace reports-workspace">
      <header className="workspace-header reports-header">
        <div>
          <p className="eyebrow">Historical analytics</p>
          <h1>Reports</h1>
          <p>Historical business performance across all connected commerce platforms.</p>
        </div>
        <button className="secondary-button" onClick={() => void loadReports()} type="button">
          <RefreshCcw size={16} aria-hidden="true" />
          Refresh
        </button>
      </header>

      <ReportsFilters filters={filters} onUpdate={updateFilter} stores={overview?.stores ?? []} />

      {error ? (
        <section className="state-banner error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          {error}
        </section>
      ) : null}

      {loading ? <ReportsLoadingState /> : null}
      {!loading && !error && overview ? <ReportsOverviewView overview={overview} /> : null}
    </main>
  );
}

export function ReportsOverviewView({ overview }: { readonly overview: ReportsOverviewResponse }) {
  return (
    <>
      <section className="reports-kpi-grid" aria-label="Report KPI summary">
        <ReportKpiCard
          href={ordersHref(overview.filters.dateFrom, overview.filters.dateTo)}
          icon={<BarChart3 size={18} aria-hidden="true" />}
          label="Revenue"
          value={formatCurrency(overview.kpis.revenue)}
        />
        <ReportKpiCard
          href={ordersHref(overview.filters.dateFrom, overview.filters.dateTo)}
          icon={<ShoppingCart size={18} aria-hidden="true" />}
          label="Orders"
          value={overview.kpis.orders.toString()}
        />
        <ReportKpiCard
          href={ordersHref(overview.filters.dateFrom, overview.filters.dateTo)}
          icon={<CheckCircle2 size={18} aria-hidden="true" />}
          label="Average Order Value"
          value={formatCurrency(overview.kpis.averageOrderValue)}
        />
        <ReportKpiCard
          href={ordersHref(overview.filters.dateFrom, overview.filters.dateTo)}
          icon={<RefreshCcw size={18} aria-hidden="true" />}
          label="Refunds"
          value={overview.kpis.refunds.toString()}
        />
        <ReportKpiCard
          href="/today"
          icon={<CheckCircle2 size={18} aria-hidden="true" />}
          label="Business Health Score"
          value={overview.kpis.businessHealthScore.toString()}
        />
      </section>

      <div className="reports-chart-grid">
        <TrendChart
          hrefForPoint={(point) => ordersHref(point.date, point.date)}
          title="Revenue Trend"
          valueFormatter={formatCurrency}
          points={overview.revenueTrend}
        />
        <TrendChart
          hrefForPoint={(point) => ordersHref(point.date, point.date)}
          title="Orders Trend"
          valueFormatter={(value) => value.toString()}
          points={overview.ordersTrend}
        />
      </div>

      <div className="reports-chart-grid">
        <PlatformBarChart
          metrics={overview.revenueByPlatform}
          title="Revenue by Platform"
          valueFormatter={formatCurrency}
        />
        <PlatformBarChart
          metrics={overview.ordersByPlatform}
          title="Orders by Platform"
          valueFormatter={(value) => value.toString()}
        />
      </div>

      <div className="reports-table-grid">
        <TopProductsTable products={overview.topProducts} />
        <TopCustomersTable customers={overview.topCustomers} />
      </div>

      <section className="reports-inventory-grid" aria-label="Inventory report summary">
        <ReportKpiCard
          href="/inventory"
          icon={<Boxes size={18} aria-hidden="true" />}
          label="Inventory Value"
          value={formatCurrency(overview.inventory.inventoryValue)}
        />
        <ReportKpiCard
          href="/inventory?stockStatus=lowstock"
          icon={<Boxes size={18} aria-hidden="true" />}
          label="Low Stock"
          value={overview.inventory.lowStock.toString()}
        />
        <ReportKpiCard
          href="/inventory?stockStatus=outofstock"
          icon={<AlertCircle size={18} aria-hidden="true" />}
          label="Out of Stock"
          value={overview.inventory.outOfStock.toString()}
        />
        <ReportKpiCard
          href="/inventory?stockStatus=lowstock"
          icon={<AlertCircle size={18} aria-hidden="true" />}
          label="Inventory Risk"
          value={overview.inventory.inventoryRisk.toString()}
        />
      </section>
    </>
  );
}

function ReportsFilters({
  filters,
  onUpdate,
  stores,
}: {
  readonly filters: ReportsFilterState;
  readonly onUpdate: <Key extends keyof ReportsFilterState>(
    key: Key,
    value: ReportsFilterState[Key],
  ) => void;
  readonly stores: readonly ReportsStoreFilterOption[];
}) {
  const visibleStores =
    filters.platform === allPlatforms
      ? stores
      : stores.filter((store) => store.platform === filters.platform);

  return (
    <section className="panel reports-filter-panel" aria-label="Report filters">
      <label>
        <span>Date Range</span>
        <select
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            onUpdate("dateRange", event.target.value as DateRangePreset)
          }
          value={filters.dateRange}
        >
          <option value="TODAY">Today</option>
          <option value="7_DAYS">7 Days</option>
          <option value="30_DAYS">30 Days</option>
          <option value="90_DAYS">90 Days</option>
          <option value="YEAR">Year</option>
          <option value="CUSTOM">Custom</option>
        </select>
      </label>
      <label>
        <span>Platform</span>
        <select
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            onUpdate("platform", event.target.value as StorePlatform | typeof allPlatforms)
          }
          value={filters.platform}
        >
          <option value={allPlatforms}>All platforms</option>
          <option value={StorePlatform.WooCommerce}>WooCommerce</option>
          <option value={StorePlatform.AmazonSeller}>Amazon Seller</option>
          <option value={StorePlatform.Shopify}>Shopify</option>
          <option value={StorePlatform.TikTokShop}>TikTok Shop</option>
        </select>
      </label>
      <label>
        <span>Store</span>
        <select
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            onUpdate("store", event.target.value)
          }
          value={filters.store}
        >
          <option value={allStores}>All stores</option>
          {visibleStores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.storeName}
            </option>
          ))}
        </select>
      </label>
      {filters.dateRange === "CUSTOM" ? (
        <>
          <label>
            <span>From</span>
            <input
              onChange={(event) => onUpdate("customDateFrom", event.target.value)}
              type="date"
              value={filters.customDateFrom}
            />
          </label>
          <label>
            <span>To</span>
            <input
              onChange={(event) => onUpdate("customDateTo", event.target.value)}
              type="date"
              value={filters.customDateTo}
            />
          </label>
        </>
      ) : null}
    </section>
  );
}

function ReportKpiCard({
  href,
  icon,
  label,
  value,
}: {
  readonly href: string;
  readonly icon: ReactNode;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <Link className="metric-tile reports-kpi-card clickable-card" href={href}>
      <span className="metric-icon">{icon}</span>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>Open detail view</small>
    </Link>
  );
}

function TrendChart({
  hrefForPoint,
  points,
  title,
  valueFormatter,
}: {
  readonly hrefForPoint: (point: ReportsTrendPoint) => string;
  readonly points: readonly ReportsTrendPoint[];
  readonly title: string;
  readonly valueFormatter: (value: number) => string;
}) {
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const chartPoints = points.map((point, index) => ({
    ...point,
    x: points.length <= 1 ? 50 : (index / (points.length - 1)) * 100,
    y: 100 - (point.value / maxValue) * 84 - 8,
  }));
  const polyline = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <section className="panel reports-chart-panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <p>Click any point to inspect the underlying orders for that day.</p>
        </div>
      </div>
      {points.length > 0 ? (
        <div className="reports-line-chart">
          <svg aria-label={title} preserveAspectRatio="none" viewBox="0 0 100 100">
            <polyline points={polyline} />
            {chartPoints.map((point) => (
              <a href={hrefForPoint(point)} key={point.date}>
                <circle cx={point.x} cy={point.y} r="2.8">
                  <title>{`${formatShortDate(point.date)}: ${valueFormatter(point.value)}`}</title>
                </circle>
              </a>
            ))}
          </svg>
          <div className="reports-chart-axis">
            <span>{formatShortDate(points[0]?.date ?? "")}</span>
            <strong>{valueFormatter(maxValue)}</strong>
            <span>{formatShortDate(points[points.length - 1]?.date ?? "")}</span>
          </div>
        </div>
      ) : (
        <ReportsEmptyBlock message="No trend data in this reporting period." />
      )}
    </section>
  );
}

function PlatformBarChart({
  metrics,
  title,
  valueFormatter,
}: {
  readonly metrics: readonly ReportsPlatformMetric[];
  readonly title: string;
  readonly valueFormatter: (value: number) => string;
}) {
  const maxValue = Math.max(...metrics.map((metric) => metric.value), 1);

  return (
    <section className="panel reports-chart-panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <p>Each platform remains separate for source integrity.</p>
        </div>
      </div>
      {metrics.length > 0 ? (
        <div className="reports-bar-list">
          {metrics.map((metric) => (
            <Link
              className={`reports-bar-row ${getPlatformClass(metric.platform)}`}
              href={`/platforms/${metric.platform}`}
              key={metric.platform}
            >
              <span className="platform-cell">
                <PlatformIcon platform={metric.platform} size="sm" />
                {formatPlatform(metric.platform)}
              </span>
              <div className="reports-bar-track">
                <span style={{ width: `${Math.max((metric.value / maxValue) * 100, 4)}%` }} />
              </div>
              <strong>{valueFormatter(metric.value)}</strong>
            </Link>
          ))}
        </div>
      ) : (
        <ReportsEmptyBlock message="No platform data in this reporting period." />
      )}
    </section>
  );
}

function TopProductsTable({ products }: { readonly products: readonly ReportsTopProduct[] }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Top Products</h2>
          <p>Products ranked by historical revenue in the selected period.</p>
        </div>
      </div>
      {products.length > 0 ? (
        <div className="orders-table-wrap">
          <table className="orders-table reports-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Platform</th>
                <th>Units Sold</th>
                <th>Revenue</th>
                <th>Inventory</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={`${product.platform}:${product.productId ?? product.productName}`}>
                  <td>
                    <Link
                      href={`/products?platform=${product.platform}&search=${encodeURIComponent(product.productName)}`}
                    >
                      <strong>{product.productName}</strong>
                      <span>{product.sku ?? "No SKU"}</span>
                    </Link>
                  </td>
                  <td>
                    <span className="platform-cell">
                      <PlatformIcon platform={product.platform} size="sm" />
                      {formatPlatform(product.platform)}
                    </span>
                  </td>
                  <td>{product.unitsSold}</td>
                  <td>{formatCurrency(product.revenue)}</td>
                  <td>{product.inventory ?? "No quantity"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ReportsEmptyBlock message="No product sales in this reporting period." />
      )}
    </section>
  );
}

function TopCustomersTable({ customers }: { readonly customers: readonly ReportsTopCustomer[] }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Top Customers</h2>
          <p>Customers ranked by spend in the selected period.</p>
        </div>
      </div>
      {customers.length > 0 ? (
        <div className="orders-table-wrap">
          <table className="orders-table reports-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Orders</th>
                <th>Lifetime Spend</th>
                <th>Average Order Value</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.customerId ?? customer.customerName}>
                  <td>
                    <Link href={`/customers?search=${encodeURIComponent(customer.customerName)}`}>
                      <strong>{customer.customerName}</strong>
                    </Link>
                  </td>
                  <td>{customer.orders}</td>
                  <td>{formatCurrency(customer.lifetimeSpend)}</td>
                  <td>{formatCurrency(customer.averageOrderValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ReportsEmptyBlock message="No customer spend in this reporting period." />
      )}
    </section>
  );
}

function ReportsLoadingState() {
  return (
    <section className="today-loading" aria-label="Loading reports">
      <Loader2 className="spin" size={24} aria-hidden="true" />
      <span>Preparing historical analytics across connected commerce platforms...</span>
    </section>
  );
}

function ReportsEmptyBlock({ message }: { readonly message: string }) {
  return (
    <div className="empty-state compact-empty">
      <BarChart3 size={22} aria-hidden="true" />
      <strong>{message}</strong>
    </div>
  );
}

function toApiFilters(filters: ReportsFilterState): ReportsOverviewFilters {
  const dateRange = getDateRange(filters);

  return {
    dateFrom: toStartOfDay(dateRange.dateFrom),
    dateTo: toEndOfDay(dateRange.dateTo),
    ...(filters.platform !== allPlatforms ? { platform: filters.platform } : {}),
    ...(filters.store !== allStores ? { store: filters.store } : {}),
  };
}

function getDateRange(filters: ReportsFilterState): {
  readonly dateFrom: string;
  readonly dateTo: string;
} {
  const today = new Date();
  const todayString = toDateInputValue(today);

  if (filters.dateRange === "CUSTOM") {
    return {
      dateFrom: filters.customDateFrom || todayString,
      dateTo: filters.customDateTo || todayString,
    };
  }

  const start = new Date(today);

  if (filters.dateRange === "TODAY") {
    return { dateFrom: todayString, dateTo: todayString };
  }

  if (filters.dateRange === "YEAR") {
    start.setMonth(0, 1);
  } else {
    const days = filters.dateRange === "7_DAYS" ? 6 : filters.dateRange === "90_DAYS" ? 89 : 29;
    start.setDate(start.getDate() - days);
  }

  return {
    dateFrom: toDateInputValue(start),
    dateTo: todayString,
  };
}

function getFriendlyError(error: unknown): string {
  const authMessage = getFriendlyAuthErrorMessage(error);

  if (authMessage) {
    return authMessage;
  }

  if (error instanceof ReportsClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load reports.";
}

function ordersHref(dateFrom: string, dateTo: string): string {
  return `/orders?dateFrom=${encodeURIComponent(toDateOnly(dateFrom))}&dateTo=${encodeURIComponent(toDateOnly(dateTo))}`;
}

function toStartOfDay(value: string): string {
  return `${value}T00:00:00.000Z`;
}

function toEndOfDay(value: string): string {
  return `${value}T23:59:59.999Z`;
}

function toDateOnly(value: string): string {
  return value.slice(0, 10);
}

function toDateInputValue(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    currency: "GBP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatShortDate(value: string): string {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
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

function getPlatformClass(platform: StorePlatform): string {
  switch (platform) {
    case StorePlatform.AmazonSeller:
      return "platform-amazon";
    case StorePlatform.Shopify:
      return "platform-shopify";
    case StorePlatform.TikTokShop:
      return "platform-tiktok";
    case StorePlatform.WooCommerce:
      return "platform-woocommerce";
  }
}
